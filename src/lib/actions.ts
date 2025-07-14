'use server';

import { processVideoChunkFlow } from '@/ai/flows/generate-video-description';
import { db, storage } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { z } from 'zod';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Helper functions
const timeStringToSeconds = (time: string): number => {
    const parts = time.split(':');
    const seconds = parts.pop() || '0';
    const minutes = parts.pop() || '0';
    const hours = parts.pop() || '0';
    return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
};

const secondsToTimeString = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
};

const serializeProject = (doc: any) => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
    };
};

// Firestore Collection
const projectsCollection = collection(db, 'projects');

// Server Actions

export async function getUploadUrl(input: { fileName: string, contentType: string }) {
    const { fileName, contentType } = input;
    const gcsPath = `videos/${Date.now()}-${fileName}`;

    const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!);
    const file = bucket.file(gcsPath);

    const options = {
        version: 'v4' as const,
        action: 'write' as const,
        expires: Date.now() + 15 * 60 * 1000,
        contentType,
    };

    const [url] = await file.getSignedUrl(options);
    return { uploadUrl: url, gcsPath };
}


export async function createProject(input: { projectName: string, gcsPath: string }) {
    const { projectName, gcsPath } = input;
    
    const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!);
    const file = bucket.file(gcsPath);
    const [videoUrl] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    const projectDoc = await addDoc(projectsCollection, {
      name: projectName,
      originalVideoUrl: videoUrl,
      gcsPath: gcsPath,
      createdAt: new Date(),
      scenes: [],
      status: 'uploaded',
    });

    return { projectId: projectDoc.id };
}

export async function generateThumbnails(input: { projectId: string, videoUrl: string }) {
    const { projectId, videoUrl } = input;
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    const projectData = projectDoc.data();

    if (!projectData || !projectData.scenes || projectData.scenes.length === 0) {
        return { error: "No scenes to generate thumbnails for." };
    }

    const tempDir = path.join(os.tmpdir(), 'machete', `thumbs-${Date.now()}`);
    const videoPath = path.join(tempDir, 'input.mp4');

    try {
        await fs.promises.mkdir(tempDir, { recursive: true });

        await new Promise<void>((resolve, reject) => {
            ffmpeg(videoUrl).outputOptions('-c', 'copy').on('end', () => resolve()).on('error', (err) => reject(new Error(`Failed to download video: ${err.message}`))).save(videoPath);
        });

        const updatedScenes = await Promise.all(projectData.scenes.map(async (scene: any) => {
            if (scene.thumbnail) return scene;

            const frameOutputPath = path.join(tempDir, `thumb-${scene.id}.jpg`);
            await new Promise<void>((resolve, reject) => {
                ffmpeg(videoPath)
                    .setStartTime(scene.startTime)
                    .frames(1)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(new Error(`Failed to capture frame: ${err.message}`)))
                    .save(frameOutputPath);
            });
            
            const thumbBuffer = await fs.promises.readFile(frameOutputPath);
            const thumbnail = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;
            await fs.promises.unlink(frameOutputPath);
            return { ...scene, thumbnail };
        }));

        await updateDoc(projectRef, { scenes: updatedScenes });
        return { success: true };

    } catch (e: any) {
        console.error('Error generating thumbnails:', e);
        return { error: e.message };
    } finally {
        if (fs.existsSync(tempDir)) {
          await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    }
}

export async function analyzeProject(input: { projectId: string; videoUrl: string }) {
  const { projectId, videoUrl } = input;
  const projectRef = doc(db, 'projects', projectId);
  
  await updateDoc(projectRef, { status: 'analyzing' });

  const tempId = `analysis-${Date.now()}`;
  const tempDir = path.join(os.tmpdir(), 'machete', tempId);
  const videoPath = path.join(tempDir, 'input.mp4');

  try {
    await fs.promises.mkdir(tempDir, { recursive: true });

    await new Promise<void>((resolve, reject) => {
        ffmpeg(videoUrl)
            .outputOptions('-c', 'copy')
            .on('end', () => resolve())
            .on('error', (err) => reject(new Error(`Failed to download video from GCS: ${err.message}`)))
            .save(videoPath);
    });

    const videoDuration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) return reject(new Error('Failed to get video duration.'));
        resolve(metadata.format.duration || 0);
      });
    });

    const CHUNK_DURATION_SECONDS = 240;
    const allScenes: any[] = [];
    let sceneIdCounter = 1;

    for (let i = 0; i < videoDuration; i += CHUNK_DURATION_SECONDS) {
      const chunkStartTime = i;
      const chunkOutputPath = path.join(tempDir, `chunk-${i}.mp4`);
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .setStartTime(chunkStartTime)
          .setDuration(CHUNK_DURATION_SECONDS)
          .outputOptions('-c', 'copy')
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`ffmpeg failed to create chunk: ${err.message}`)))
          .save(chunkOutputPath);
      });

      const chunkBuffer = await fs.promises.readFile(chunkOutputPath);
      const chunkDataUri = `data:video/mp4;base64,${chunkBuffer.toString('base64')}`;
      
      const result = await processVideoChunkFlow({ videoDataUri: chunkDataUri });

      if (result && result.scenes) {
        const adjustedScenes = result.scenes.map(scene => ({
          id: sceneIdCounter++,
          startTime: secondsToTimeString(timeStringToSeconds(scene.startTime) + chunkStartTime),
          endTime: secondsToTimeString(timeStringToSeconds(scene.endTime) + chunkStartTime),
          description: scene.description,
        }));
        allScenes.push(...adjustedScenes);
      }
      await fs.promises.unlink(chunkOutputPath);
    }
    
    await updateDoc(projectRef, { scenes: allScenes, status: 'analyzed' });
    return { success: true };

  } catch (e: any) {
    console.error(`Background analysis for project ${projectId} failed:`, e);
    await updateDoc(projectRef, { status: 'error', analysisError: e.message });
    return { error: e.message };
  } finally {
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }
}

export async function getProjects() {
  try {
    const snapshot = await getDocs(projectsCollection);
    const projects = snapshot.docs.map(serializeProject);
    return { projects };
  } catch (e: any) {
    return { error: `Failed to fetch projects: ${e.message}` };
  }
}

export async function getProject(input: { projectId: string }) {
    try {
        const projectDoc = await getDoc(doc(db, 'projects', input.projectId));
        if (!projectDoc.exists()) return { error: 'Project not found.' };
        return { project: serializeProject(projectDoc) };
    } catch (e: any) {
        return { error: `Failed to fetch project: ${e.message}` };
    }
}

export async function updateProject(input: { projectId: string, scenes: any[] }) {
    try {
        const projectRef = doc(db, 'projects', input.projectId);
        await updateDoc(projectRef, { scenes: input.scenes });
        return { success: true };
    } catch (e: any) {
        return { error: `Failed to update project: ${e.message}` };
    }
}

export async function deleteProject(input: { projectId: string }) {
    try {
        await deleteDoc(doc(db, 'projects', input.projectId));
        return { success: true };
    } catch (e: any) {
        return { error: `Failed to delete project: ${e.message}` };
    }
}

export async function clipVideo(input: { videoUrl: string; startTime: string; endTime: string; }) {
    const { videoUrl, startTime, endTime } = input;
    const tempId = `clip-${Date.now()}`;
    const tempDir = path.join(os.tmpdir(), 'machete', tempId);
    const outputPath = path.join(tempDir, 'output.mp4');
  
    try {
        await fs.promises.mkdir(tempDir, { recursive: true });

        const duration = timeStringToSeconds(endTime) - timeStringToSeconds(startTime);
        if (duration <= 0) return { error: 'End time must be after start time.' };

        await new Promise<void>((resolve, reject) => {
            ffmpeg(videoUrl)
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

    } catch (e: any) {
        return { error: `An unexpected error occurred during clipping: ${e.message}` };
    } finally {
        if (fs.existsSync(tempDir)) {
          await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    }
}
