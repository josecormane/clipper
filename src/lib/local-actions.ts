'use server';

import { processVideoChunkWithCustomApiFlow } from '@/ai/flows/generate-video-description-custom';
import * as localStorage from '@/lib/local-storage';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Helper functions - Gemini-specific time parser
const timeStringToSeconds = (time: string): number => {
  try {
    const parts = time.split(':');
    
    if (parts.length === 3) {
      // Gemini format: MM:SS:mmm (where mmm is milliseconds, not decimal seconds)
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      const milliseconds = parseInt(parts[2], 10);
      
      const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
      
      console.log(`🔍 Parsing Gemini time: ${time} = ${minutes}m ${seconds}s ${milliseconds}ms = ${totalSeconds}s`);
      return totalSeconds;
    } else if (parts.length === 2) {
      // Format: MM:SS
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      console.log(`🔍 Parsing MM:SS: ${time} = ${minutes}m ${seconds}s`);
      return minutes * 60 + seconds;
    } else {
      console.warn(`🔍 Unknown time format: ${time}`);
      return parseFloat(time) || 0;
    }
  } catch (error) {
    console.error('Error parsing time string:', time, error);
    return 0;
  }
};

const secondsToTimeString = (totalSeconds: number): string => {
  try {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    // Format with proper decimal places
    const formattedSeconds = seconds.toFixed(3);
    
    const result = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${formattedSeconds.padStart(6, '0')}`;
    
    console.log(`🔍 Converting ${totalSeconds}s to time: ${result}`);
    return result;
  } catch (error) {
    console.error('Error converting seconds to time string:', totalSeconds, error);
    return '00:00:00.000';
  }
};

// Server Actions

export async function getAllProjectsLocal() {
  try {
    const projects = localStorage.getAllProjects();
    return { projects };
  } catch (e: any) {
    return { error: `Failed to fetch projects: ${e.message}` };
  }
}

export async function getProjectLocal(input: { projectId: string }) {
  try {
    const project = localStorage.getProject(input.projectId);
    if (!project) return { error: 'Project not found.' };
    return { project };
  } catch (e: any) {
    return { error: `Failed to fetch project: ${e.message}` };
  }
}

export async function createProjectLocal(input: { 
  projectName: string; 
  videoBuffer: Buffer; 
  originalFileName: string;
}): Promise<{ projectId: string } | { error: string }> {
  const { projectName, videoBuffer, originalFileName } = input;
  
  try {
    // Obtener duración del video
    const tempVideoPath = path.join(os.tmpdir(), `temp_${Date.now()}_${originalFileName}`);
    fs.writeFileSync(tempVideoPath, videoBuffer);
    
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
        if (err) return reject(new Error('Failed to get video duration.'));
        resolve(metadata.format.duration || 0);
      });
    });
    
    // Limpiar archivo temporal
    fs.unlinkSync(tempVideoPath);
    
    // Crear proyecto
    const project = localStorage.createProject({
      name: projectName,
      videoBuffer,
      originalFileName,
      duration
    });
    
    return { projectId: project.id };
  } catch (e: any) {
    return { error: `Failed to create project: ${e.message}` };
  }
}

export async function analyzeProjectLocal(input: { 
  projectId: string; 
  apiKey: string;
}) {
  const { projectId, apiKey } = input;
  
  try {
    // Actualizar estado a analyzing
    localStorage.updateProject(projectId, { 
      status: 'analyzing', 
      lastModified: new Date().toISOString() 
    });
    
    const project = localStorage.getProject(projectId);
    if (!project) {
      return { error: 'Project not found' };
    }
    
    const videoPath = project.originalVideoPath;
    const tempId = `analysis-${Date.now()}`;
    const tempDir = path.join(os.tmpdir(), 'machete', tempId);
    
    try {
      await fs.promises.mkdir(tempDir, { recursive: true });
      
      // Obtener duración del video
      const videoDuration = await new Promise<number>((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
          if (err) return reject(new Error('Failed to get video duration.'));
          resolve(metadata.format.duration || 0);
        });
      });
      
      const CHUNK_DURATION_SECONDS = 240; // 4 minutos por chunk
      const allScenes: any[] = [];
      let sceneIdCounter = 1;
      
      for (let i = 0; i < videoDuration; i += CHUNK_DURATION_SECONDS) {
        const chunkStartTime = i;
        const chunkOutputPath = path.join(tempDir, `chunk-${i}.mp4`);
        
        // Crear chunk
        await new Promise<void>((resolve, reject) => {
          ffmpeg(videoPath)
            .setStartTime(chunkStartTime)
            .setDuration(CHUNK_DURATION_SECONDS)
            .outputOptions('-c', 'copy')
            .on('end', () => resolve())
            .on('error', (err) => reject(new Error(`ffmpeg failed to create chunk: ${err.message}`)))
            .save(chunkOutputPath);
        });
        
        // Convertir chunk a base64
        const chunkBuffer = await fs.promises.readFile(chunkOutputPath);
        const chunkDataUri = `data:video/mp4;base64,${chunkBuffer.toString('base64')}`;
        
        // Analizar chunk con Gemini
        console.log(`\n🎬 ANALYZING CHUNK ${Math.floor(i / CHUNK_DURATION_SECONDS) + 1}`);
        console.log(`📍 Chunk starts at: ${chunkStartTime}s (${secondsToTimeString(chunkStartTime)})`);
        console.log(`📏 Chunk duration: ${CHUNK_DURATION_SECONDS}s`);
        console.log(`💾 Chunk size: ${(chunkBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        
        const result = await processVideoChunkWithCustomApiFlow({ 
          videoDataUri: chunkDataUri,
          apiKey: apiKey
        });
        
        console.log(`\n🤖 GEMINI RESPONSE FOR CHUNK ${Math.floor(i / CHUNK_DURATION_SECONDS) + 1}:`);
        console.log('📋 Full Response:', JSON.stringify(result, null, 2));
        
        if (result && result.scenes) {
          console.log(`\n✅ Found ${result.scenes.length} scenes in chunk:`);
          
          // Log raw scenes from Gemini
          result.scenes.forEach((scene, idx) => {
            console.log(`  Raw Scene ${idx + 1}: ${scene.startTime} - ${scene.endTime} | "${scene.description}"`);
          });
          
          const adjustedScenes: any[] = [];
          console.log(`\n🔧 ADJUSTING SCENE TIMES (adding ${chunkStartTime}s offset):`);
          
          for (const scene of result.scenes) {
            try {
              const rawStartSeconds = timeStringToSeconds(scene.startTime);
              const rawEndSeconds = timeStringToSeconds(scene.endTime);
              const sceneStartSeconds = rawStartSeconds + chunkStartTime;
              const sceneEndSeconds = rawEndSeconds + chunkStartTime;
              
              const adjustedScene = {
                id: sceneIdCounter++,
                startTime: secondsToTimeString(sceneStartSeconds),
                endTime: secondsToTimeString(sceneEndSeconds),
                description: scene.description,
                thumbnail: '',
              };
              
              console.log(`  Scene ${adjustedScene.id}:`);
              console.log(`    Raw: ${scene.startTime} (${rawStartSeconds}s) - ${scene.endTime} (${rawEndSeconds}s)`);
              console.log(`    Adjusted: ${adjustedScene.startTime} (${sceneStartSeconds}s) - ${adjustedScene.endTime} (${sceneEndSeconds}s)`);
              console.log(`    Description: "${adjustedScene.description}"`);
              
              // Generar thumbnail (sin bloquear si falla)
              try {
                const { thumbnail } = await generateThumbnailLocal({ 
                  videoPath: videoPath, 
                  scene: adjustedScene 
                });
                if (thumbnail) {
                  adjustedScene.thumbnail = thumbnail;
                  console.log(`    ✅ Thumbnail generated`);
                } else {
                  console.log(`    ⚠️ Thumbnail generation failed (empty result)`);
                }
              } catch (thumbError) {
                console.warn(`    ❌ Thumbnail error for scene ${adjustedScene.id}:`, thumbError.message);
              }
              
              adjustedScenes.push(adjustedScene);
            } catch (sceneError) {
              console.error('❌ Error processing scene:', scene, sceneError);
            }
          }
          
          console.log(`\n📊 CHUNK ${Math.floor(i / CHUNK_DURATION_SECONDS) + 1} SUMMARY:`);
          console.log(`  - Scenes found: ${result.scenes.length}`);
          console.log(`  - Scenes processed: ${adjustedScenes.length}`);
          console.log(`  - Total scenes so far: ${allScenes.length + adjustedScenes.length}`);
          
          allScenes.push(...adjustedScenes);
        } else {
          console.log(`❌ No scenes found in chunk ${Math.floor(i / CHUNK_DURATION_SECONDS) + 1}`);
        }
        
        // Limpiar chunk temporal
        await fs.promises.unlink(chunkOutputPath);
      }
      
      // Actualizar proyecto con resultados
      localStorage.updateProject(projectId, { 
        scenes: allScenes, 
        status: 'analyzed' 
      });
      
      console.log('\n🎉 =============== ANALYSIS COMPLETE ===============');
      console.log(`📊 Final Results:`);
      console.log(`  - Total video duration: ${videoDuration}s (${secondsToTimeString(videoDuration)})`);
      console.log(`  - Chunks processed: ${Math.ceil(videoDuration / CHUNK_DURATION_SECONDS)}`);
      console.log(`  - Total scenes found: ${allScenes.length}`);
      console.log(`  - Average scene length: ${(videoDuration / allScenes.length).toFixed(1)}s`);
      console.log(`  - First scene: ${allScenes[0]?.startTime} - ${allScenes[0]?.endTime}`);
      console.log(`  - Last scene: ${allScenes[allScenes.length - 1]?.startTime} - ${allScenes[allScenes.length - 1]?.endTime}`);
      console.log('===============================================\n');
      
      return { success: true };
    } catch (e: any) {
      console.error(`Analysis for project ${projectId} failed:`, e);
      localStorage.updateProject(projectId, { 
        status: 'error', 
        analysisError: e.message 
      });
      return { error: e.message };
    } finally {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    }
  } catch (e: any) {
    return { error: `Failed to analyze project: ${e.message}` };
  }
}

export async function generateThumbnailLocal(input: { videoPath: string, scene: any }) {
  const { videoPath, scene } = input;
  const tempDir = path.join(os.tmpdir(), 'machete', `thumb-${scene.id}-${Date.now()}`);
  
  try {
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    const frameOutputPath = path.join(tempDir, `thumb.jpg`);
    
    // Convertir tiempo a segundos para FFmpeg
    const startTimeSeconds = timeStringToSeconds(scene.startTime);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(startTimeSeconds) // Usar seekInput en lugar de setStartTime
        .frames(1)
        .outputOptions([
          '-vf', 'scale=320:240:force_original_aspect_ratio=decrease,pad=320:240:(ow-iw)/2:(oh-ih)/2',
          '-q:v', '2'
        ])
        .on('end', () => resolve())
        .on('error', (err) => {
          console.error('FFmpeg error details:', err);
          reject(new Error(`Failed to capture frame: ${err.message}`));
        })
        .save(frameOutputPath);
    });

    const thumbBuffer = await fs.promises.readFile(frameOutputPath);
    const thumbnail = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;
    return { thumbnail };
  } catch (e: any) {
    console.error('Error generating thumbnail:', e);
    // Retornar un thumbnail por defecto en caso de error
    return { thumbnail: '' };
  } finally {
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }
}

export async function updateProjectLocal(input: { projectId: string, scenes: any[] }) {
  try {
    const updatedProject = localStorage.updateProject(input.projectId, { 
      scenes: input.scenes 
    });
    if (!updatedProject) {
      return { error: 'Project not found' };
    }
    return { success: true };
  } catch (e: any) {
    return { error: `Failed to update project: ${e.message}` };
  }
}

export async function deleteProjectLocal(input: { projectId: string }) {
  try {
    const success = localStorage.deleteProject(input.projectId);
    if (!success) {
      return { error: 'Project not found' };
    }
    return { success: true };
  } catch (e: any) {
    return { error: `Failed to delete project: ${e.message}` };
  }
}

export async function clipVideoLocal(input: { 
  projectId: string;
  startTime: string; 
  endTime: string; 
}): Promise<{ clipDataUri?: string; error?: string }> {
  const { projectId, startTime, endTime } = input;
  
  try {
    const project = localStorage.getProject(projectId);
    if (!project) {
      return { error: 'Project not found' };
    }
    
    const videoPath = project.originalVideoPath;
    const tempId = `clip-${Date.now()}`;
    const tempDir = path.join(os.tmpdir(), 'machete', tempId);
    const outputPath = path.join(tempDir, 'output.mp4');

    try {
      await fs.promises.mkdir(tempDir, { recursive: true });

      const duration = timeStringToSeconds(endTime) - timeStringToSeconds(startTime);
      if (duration <= 0) return { error: 'End time must be after start time.' };

      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .setStartTime(startTime)
          .setDuration(duration)
          .outputOptions('-c', 'copy')
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`ffmpeg failed to clip: ${err.message}`)))
          .save(outputPath);
      });
      
      const clipBuffer = await fs.promises.readFile(outputPath);
      const clipDataUri = `data:video/mp4;base64,${clipBuffer.toString('base64')}`;

      return { clipDataUri };
    } finally {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
    }
  } catch (e: any) {
    return { error: `An unexpected error occurred during clipping: ${e.message}` };
  }
}

export async function getStorageStatsLocal() {
  try {
    const stats = localStorage.getStorageStats();
    return { stats };
  } catch (e: any) {
    return { error: `Failed to get storage stats: ${e.message}` };
  }
}