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
      // Detectar si es formato Gemini (MM:SS:mmm) o formato estándar (HH:MM:SS.mmm)
      const firstPart = parseInt(parts[0], 10);
      const secondPart = parseInt(parts[1], 10);
      const thirdPart = parseFloat(parts[2]);
      
      // Si el primer número es 00 y el segundo es también pequeño, probablemente es HH:MM:SS.mmm
      if (firstPart === 0 && secondPart < 60 && thirdPart < 60) {
        // Formato estándar: HH:MM:SS.mmm
        const hours = firstPart;
        const minutes = secondPart;
        const seconds = thirdPart;
        
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        
        console.log(`🔍 Parsing HH:MM:SS time: ${time} = ${hours}h ${minutes}m ${seconds}s = ${totalSeconds}s`);
        return totalSeconds;
      } else {
        // Formato Gemini: MM:SS:mmm (minutos:segundos:milisegundos)
        const minutes = firstPart;
        const seconds = secondPart;
        const milliseconds = parseInt(parts[2], 10);
        
        const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
        
        console.log(`🔍 Parsing MM:SS:mmm time: ${time} = ${minutes}m ${seconds}s ${milliseconds}ms = ${totalSeconds}s`);
        return totalSeconds;
      }
    } else if (parts.length === 2) {
      // Format: MM:SS.mmm (alternative format)
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]); // Esto maneja SS.mmm correctamente
      
      const totalSeconds = minutes * 60 + seconds;
      
      console.log(`🔍 Parsing MM:SS time: ${time} = ${minutes}m ${seconds}s = ${totalSeconds}s`);
      return totalSeconds;
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
      
      // Actualizar proyecto con resultados y guardar escenas originales
      localStorage.updateProject(projectId, { 
        scenes: allScenes, 
        originalScenes: allScenes, // Guardar copia de las escenas originales de Gemini
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
    
    console.log(`🖼️ Generating thumbnail for scene ${scene.id}:`);
    console.log(`   Start time: ${scene.startTime} -> ${startTimeSeconds}s`);
    
    // Validar que el tiempo sea válido
    if (isNaN(startTimeSeconds) || startTimeSeconds < 0) {
      console.error(`   ❌ Invalid start time: ${startTimeSeconds}s`);
      return { thumbnail: '' };
    }
    
    // Obtener duración del video para validar
    const videoDuration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) return reject(new Error('Failed to get video duration.'));
        resolve(metadata.format.duration || 0);
      });
    });
    
    console.log(`   📹 Video duration: ${videoDuration}s`);
    
    // Si el tiempo solicitado es mayor que la duración del video, usar un tiempo válido
    let adjustedTime = startTimeSeconds;
    if (startTimeSeconds >= videoDuration) {
      // Usar el 10% de la duración del video como fallback
      adjustedTime = Math.max(0, videoDuration * 0.1);
      console.log(`   ⚠️ Time ${startTimeSeconds}s exceeds video duration, using ${adjustedTime}s instead`);
    }
    
    await new Promise<void>((resolve, reject) => {
      const ffmpegCommand = ffmpeg(videoPath)
        .seekInput(adjustedTime)
        .frames(1)
        .outputOptions([
          '-vf', 'scale=320:240:force_original_aspect_ratio=decrease,pad=320:240:(ow-iw)/2:(oh-ih)/2',
          '-q:v', '2',
          '-f', 'image2'
        ])
        .on('start', (commandLine) => {
          console.log(`   FFmpeg command: ${commandLine}`);
        })
        .on('end', () => {
          console.log(`   ✅ Thumbnail generated successfully for scene ${scene.id}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`   ❌ FFmpeg error for scene ${scene.id}:`, err.message);
          reject(new Error(`Failed to capture frame: ${err.message}`));
        });
      
      // Timeout de 10 segundos para evitar que se cuelgue
      const timeout = setTimeout(() => {
        ffmpegCommand.kill('SIGKILL');
        reject(new Error('Thumbnail generation timeout'));
      }, 10000);
      
      ffmpegCommand.on('end', () => clearTimeout(timeout));
      ffmpegCommand.on('error', () => clearTimeout(timeout));
      
      ffmpegCommand.save(frameOutputPath);
    });

    // Verificar que el archivo se creó
    if (!fs.existsSync(frameOutputPath)) {
      console.error(`   ❌ Thumbnail file not created for scene ${scene.id}`);
      return { thumbnail: '' };
    }

    const thumbBuffer = await fs.promises.readFile(frameOutputPath);
    
    // Verificar que el buffer no esté vacío
    if (thumbBuffer.length === 0) {
      console.error(`   ❌ Empty thumbnail file for scene ${scene.id}`);
      return { thumbnail: '' };
    }
    
    const thumbnail = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;
    console.log(`   ✅ Thumbnail base64 generated (${thumbBuffer.length} bytes)`);
    return { thumbnail };
  } catch (e: any) {
    console.error(`❌ Error generating thumbnail for scene ${scene.id}:`, e.message);
    console.error(`   Scene details:`, scene);
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

      const startTimeSeconds = timeStringToSeconds(startTime);
      const endTimeSeconds = timeStringToSeconds(endTime);
      const duration = endTimeSeconds - startTimeSeconds;
      
      console.log(`🎬 Clipping scene:`);
      console.log(`  Start: ${startTime} (${startTimeSeconds}s)`);
      console.log(`  End: ${endTime} (${endTimeSeconds}s)`);
      console.log(`  Duration: ${duration}s`);
      
      if (duration <= 0) return { error: 'End time must be after start time.' };

      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .setStartTime(startTimeSeconds) // Usar segundos en lugar del string
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

export async function generateMissingThumbnailsLocal(input: { projectId: string }) {
  try {
    const project = localStorage.getProject(input.projectId);
    if (!project) {
      return { error: 'Project not found' };
    }
    
    const videoPath = project.originalVideoPath;
    const scenesWithoutThumbnails = project.scenes.filter(scene => !scene.thumbnail || scene.thumbnail === '');
    
    if (scenesWithoutThumbnails.length === 0) {
      console.log(`✅ All scenes already have thumbnails`);
      return { success: true, generated: 0 };
    }
    
    console.log(`🔄 Generating missing thumbnails for ${scenesWithoutThumbnails.length} scenes...`);
    
    const updatedScenes = [...project.scenes];
    let generatedCount = 0;
    
    for (const scene of scenesWithoutThumbnails) {
      console.log(`\n🖼️ Generating thumbnail for scene ${scene.id}...`);
      
      try {
        const { thumbnail } = await generateThumbnailLocal({ 
          videoPath: videoPath, 
          scene: scene 
        });
        
        if (thumbnail) {
          // Encontrar y actualizar la escena en el array
          const sceneIndex = updatedScenes.findIndex(s => s.id === scene.id);
          if (sceneIndex !== -1) {
            updatedScenes[sceneIndex] = { ...scene, thumbnail };
            generatedCount++;
            console.log(`✅ Scene ${scene.id} thumbnail generated successfully`);
          }
        } else {
          console.log(`⚠️ Scene ${scene.id} thumbnail generation failed`);
        }
      } catch (error) {
        console.error(`❌ Error generating thumbnail for scene ${scene.id}:`, error);
      }
    }
    
    // Solo actualizar si se generaron thumbnails
    if (generatedCount > 0) {
      localStorage.updateProject(input.projectId, { scenes: updatedScenes });
      console.log(`🎉 Generated ${generatedCount} missing thumbnails!`);
    }
    
    return { success: true, generated: generatedCount };
  } catch (e: any) {
    return { error: `Failed to generate missing thumbnails: ${e.message}` };
  }
}

export async function regenerateAllThumbnailsLocal(input: { projectId: string }) {
  try {
    const project = localStorage.getProject(input.projectId);
    if (!project) {
      return { error: 'Project not found' };
    }
    
    const videoPath = project.originalVideoPath;
    const updatedScenes = [];
    
    console.log(`🔄 Regenerating thumbnails for ${project.scenes.length} scenes...`);
    
    for (const scene of project.scenes) {
      console.log(`\n🖼️ Processing scene ${scene.id}...`);
      
      try {
        const { thumbnail } = await generateThumbnailLocal({ 
          videoPath: videoPath, 
          scene: scene 
        });
        
        const updatedScene = { ...scene, thumbnail: thumbnail || '' };
        updatedScenes.push(updatedScene);
        
        if (thumbnail) {
          console.log(`✅ Scene ${scene.id} thumbnail regenerated successfully`);
        } else {
          console.log(`⚠️ Scene ${scene.id} thumbnail generation failed`);
        }
      } catch (error) {
        console.error(`❌ Error regenerating thumbnail for scene ${scene.id}:`, error);
        updatedScenes.push(scene); // Mantener la escena sin cambios
      }
    }
    
    // Actualizar proyecto con los nuevos thumbnails
    localStorage.updateProject(input.projectId, { scenes: updatedScenes });
    
    console.log(`🎉 Thumbnail regeneration completed!`);
    return { success: true, updatedScenes };
  } catch (e: any) {
    return { error: `Failed to regenerate thumbnails: ${e.message}` };
  }
}

export async function resetScenesLocal(input: { projectId: string }) {
  try {
    const project = localStorage.getProject(input.projectId);
    if (!project) {
      return { error: 'Project not found' };
    }
    
    // Verificar si hay escenas originales guardadas
    if (!project.originalScenes || project.originalScenes.length === 0) {
      return { error: 'No original scenes found. Cannot reset.' };
    }
    
    console.log(`🔄 Resetting ${project.scenes.length} scenes to original Gemini version...`);
    console.log(`📊 Original scenes count: ${project.originalScenes.length}`);
    
    // Restaurar las escenas originales
    const resetScenes = project.originalScenes.map((scene, index) => ({
      ...scene,
      id: index + 1, // Renumerar las escenas
      thumbnail: project.scenes[index]?.thumbnail || '' // Mantener thumbnails existentes
    }));
    
    // Actualizar el proyecto con las escenas originales
    localStorage.updateProject(input.projectId, { 
      scenes: resetScenes,
      lastModified: new Date().toISOString()
    });
    
    console.log(`✅ Scenes reset successfully to original Gemini version`);
    return { success: true, resetScenes };
  } catch (e: any) {
    return { error: `Failed to reset scenes: ${e.message}` };
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