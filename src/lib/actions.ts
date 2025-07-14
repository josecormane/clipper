'use server';

import {
  generateVideoDescription,
  GenerateVideoDescriptionInput,
} from '@/ai/flows/generate-video-description';
import { z } from 'zod';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';
import os from 'os';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const videoSummarySchema = z.object({
  videoDataUri: z
    .string()
    .refine(d => d.startsWith('data:video/'), 'Must be a video data URI'),
});

export async function getVideoSummary(input: GenerateVideoDescriptionInput) {
  const parsedInput = videoSummarySchema.safeParse(input);
  if (!parsedInput.success) {
    return { error: 'Invalid input provided to server.' };
  }
  try {
    const result = await generateVideoDescription(parsedInput.data);
    return { summary: result.summary, scenes: result.scenes || [] };
  } catch (e) {
    console.error('Error in video description generation:', e);
    return {
      error: 'An unexpected error occurred while analyzing the video.',
    };
  }
}

const clipVideoSchema = z.object({
  videoDataUri: z.string().refine(d => d.startsWith('data:video/')),
  startTime: z.string(),
  endTime: z.string(),
  fileName: z.string(),
});

export async function clipVideo(input: {
  videoDataUri: string;
  startTime: string;
  endTime: string;
  fileName: string;
}) {
  const parsedInput = clipVideoSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error('Invalid input for clipVideo:', parsedInput.error);
    return { error: 'Invalid input provided to server for clipping.' };
  }

  const { videoDataUri, startTime, endTime, fileName } = parsedInput.data;

  // Create temporary files
  const tempId = `clip-${Date.now()}`;
  const tempDir = path.join(os.tmpdir(), 'geminiclipper');
  const inputPath = path.join(tempDir, `${tempId}-input.mp4`);
  const outputPath = path.join(tempDir, fileName);
  
  try {
    // Ensure temp directory exists
    await fs.promises.mkdir(tempDir, { recursive: true });

    // Decode Base64 and write to input file
    const base64Data = videoDataUri.split(';base64,').pop();
    if (!base64Data) {
      return { error: 'Invalid video data URI format.' };
    }
    await fs.promises.writeFile(inputPath, base64Data, 'base64');
    
    // Calculate duration
    const startSeconds = timeStringToSeconds(startTime);
    const endSeconds = timeStringToSeconds(endTime);
    const duration = endSeconds - startSeconds;

    if (duration <= 0) {
      return { error: 'End time must be after start time.' };
    }

    // Execute ffmpeg command
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .outputOptions('-c', 'copy') // No re-encoding
        .on('end', resolve)
        .on('error', (err) => {
          console.error('ffmpeg error:', err);
          reject(new Error('Failed to clip video.'));
        })
        .save(outputPath);
    });
    
    // Read the clipped video and return it as a data URI
    const clipBuffer = await fs.promises.readFile(outputPath);
    const clipDataUri = `data:video/mp4;base64,${clipBuffer.toString('base64')}`;

    return { clipDataUri };

  } catch (e) {
    console.error('Error in video clipping:', e);
    return {
      error: 'An unexpected error occurred while clipping the video.',
    };
  } finally {
     // Cleanup temporary files
    try {
      await fs.promises.unlink(inputPath);
      await fs.promises.unlink(outputPath);
    } catch (cleanupError) {
      console.error('Error cleaning up temp files:', cleanupError);
    }
  }
}

const timeStringToSeconds = (time: string): number => {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
};
