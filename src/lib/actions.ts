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
  query,
  orderBy,
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
        lastModified: data.lastModified instanceof Timestamp ? data.lastModified.toDate().toISOString() : data.lastModified,
    };
};

// Firestore Collection
const projectsCollection = collection(db, 'projects');

// Server Actions

export async function getAllProjects(options?: { orderBy: 'name' | 'lastModified', orderDirection: 'asc' | 'desc' }) {
    try {
      const q = options ? query(projectsCollection, orderBy(options.orderBy, options.orderDirection)) : projectsCollection;
      const snapshot = await getDocs(q);
      const projects = snapshot.docs.map(serializeProject);
      return { projects };
    } catch (e: any) {
      return { error: `Failed to fetch projects: ${e.message}` };
    }
}

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


export async function createProject(input: { projectName: string, gcsPath: string }): Promise<{ projectId: string } | { error: string }> {
    const { projectName, gcsPath } = input;
    try {
        const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!);
        const file = bucket.file(gcsPath);
        const [videoUrl] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });

        const { duration, error } = await getVideoDuration({ videoUrl });
        if (error) {
            return { error: `Failed to get video duration: ${error}` };
        }

        const projectDoc = await addDoc(projectsCollection, {
          name: projectName,
          originalVideoUrl: videoUrl,
          gcsPath: gcsPath,
          duration: duration,
          createdAt: new Date(),
          lastModified: new Date(),
          scenes: [],
          status: 'uploaded',
        });

        return { projectId: projectDoc.id };
    } catch (e: any) {
        return { error: `Failed to create project: ${e.message}` };
    }
}

export async function generateThumbnail(input: { videoPath: string, scene: any }) {
    const { videoPath, scene } = input;
    const tempDir = path.join(os.tmpdir(), 'machete', `thumb-${scene.id}-${Date.now()}`);
    
    try {
        await fs.promises.mkdir(tempDir, { recursive: true });
        
        const frameOutputPath = path.join(tempDir, `thumb.jpg`);
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
        return { thumbnail };
    } catch (e: any) {
        console.error('Error generating thumbnail:', e);
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
    await updateDoc(projectRef, { status: 'analyzing', lastModified: new Date() });
    const tempId = `analysis-${Date.now()}`;
    const tempDir = path.join(os.tmpdir(), 'machete', tempId);
    const videoPath = path.join(tempDir, 'input.mp4');
    try {
      await fs.promises.mkdir(tempDir, { recursive: true });
      await new Promise<void>((resolve, reject) => {
          ffmpeg(videoUrl).outputOptions('-c', 'copy').on('end', () => resolve()).on('error', (err) => reject(new Error(`Failed to download video from GCS: ${err.message}`))).save(videoPath);
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
          ffmpeg(videoPath).setStartTime(chunkStartTime).setDuration(CHUNK_DURATION_SECONDS).outputOptions('-c', 'copy').on('end', () => resolve()).on('error', (err) => reject(new Error(`ffmpeg failed to create chunk: ${err.message}`))).save(chunkOutputPath);
        });
        const chunkBuffer = await fs.promises.readFile(chunkOutputPath);
        const chunkDataUri = `data:video/mp4;base64,${chunkBuffer.toString('base64')}`;
        const result = await processVideoChunkFlow({ videoDataUri: chunkDataUri });
        if (result && result.scenes) {
          const adjustedScenes: any[] = [];
          for (const scene of result.scenes) {
            const adjustedScene = {
              id: sceneIdCounter++,
              startTime: secondsToTimeString(timeStringToSeconds(scene.startTime) + chunkStartTime),
              endTime: secondsToTimeString(timeStringToSeconds(scene.endTime) + chunkStartTime),
              description: scene.description,
              thumbnail: '',
            };
            const { thumbnail, error } = await generateThumbnail({ videoPath: videoPath, scene: adjustedScene });
            if (thumbnail) {
                adjustedScene.thumbnail = thumbnail;
            }
            adjustedScenes.push(adjustedScene);
          }
          allScenes.push(...adjustedScenes);
        }
        await fs.promises.unlink(chunkOutputPath);
      }
      await updateDoc(projectRef, { scenes: allScenes, status: 'analyzed', lastModified: new Date() });
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
          await updateDoc(projectRef, { scenes: input.scenes, lastModified: new Date() });
          return { success: true };
      } catch (e: any) {
          return { error: `Failed to update project: ${e.message}` };
      }
  }
  
  export async function deleteProject(input: { projectId: string }) {
    console.log(`Attempting to delete project with ID: ${input.projectId}`);
    try {
        const projectRef = doc(db, 'projects', input.projectId);
        const projectDoc = await getDoc(projectRef);

        if (!projectDoc.exists()) {
            console.error(`Project with ID ${input.projectId} not found.`);
            return { error: 'Project not found.' };
        }

        const projectData = projectDoc.data();
        console.log('Project data for deletion:', projectData);

        const gcsPath = projectData.gcsPath;
        console.log(`GCS path for deletion: ${gcsPath}`);

        if (!gcsPath || typeof gcsPath !== 'string' || gcsPath.trim() === '') {
            console.error('Invalid or missing GCS path. Aborting storage deletion.');
        } else {
            try {
                const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!);
                const file = bucket.file(gcsPath);
                console.log(`Attempting to delete file from GCS: gs://${bucket.name}/${gcsPath}`);
                await file.delete();
                console.log('File deleted from GCS successfully.');
            } catch (storageError: any) {
                console.error(`Failed to delete file from GCS: ${storageError.message}`);
            }
        }
        await deleteDoc(projectRef);
        console.log(`Project document ${input.projectId} deleted from Firestore.`);
        return { success: true };
    } catch (e: any) {
        console.error(`Error in deleteProject action for ID ${input.projectId}:`, e);
        return { error: `Failed to delete project: ${e.message}` };
    }
}
  
  export async function clipVideo(input: { videoUrl: string; startTime: string; endTime: string; }): Promise<{ clipDataUri?: string; error?: string }> {
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

  export async function updateProjectName(input: { projectId: string, newName: string }) {
    try {
        const projectRef = doc(db, 'projects', input.projectId);
        await updateDoc(projectRef, { name: input.newName, lastModified: new Date() });
        return { success: true };
    } catch (e: any) {
        return { error: `Failed to update project name: ${e.message}` };
    }
  }

  export async function getVideoDuration(input: { videoUrl: string }): Promise<{ duration?: number; error?: string }> {
    const { videoUrl } = input;
    const tempId = `duration-${Date.now()}`;
    const tempDir = path.join(os.tmpdir(), 'machete', tempId);
    const videoPath = path.join(tempDir, 'input.mp4');

    try {
        await fs.promises.mkdir(tempDir, { recursive: true });

        await new Promise<void>((resolve, reject) => {
            ffmpeg(videoUrl)
                .outputOptions('-c', 'copy')
                .on('end', () => resolve())
                .on('error', (err) => reject(new Error(`Failed to download video: ${err.message}`)))
                .save(videoPath);
        });

        const duration = await new Promise<number>((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) return reject(new Error('Failed to get video duration.'));
                resolve(metadata.format.duration || 0);
            });
        });

        return { duration };

    } catch (e: any) {
        return { error: `An unexpected error occurred during duration check: ${e.message}` };
    } finally {
        if (fs.existsSync(tempDir)) {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    }
  }
