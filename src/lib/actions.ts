'use server';

import {
  generateVideoDescription,
  GenerateVideoDescriptionInput,
} from '@/ai/flows/generate-video-description';
import { generateSceneThumbnail } from '@/ai/flows/generate-scene-thumbnail';
import { z } from 'zod';

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

const thumbnailSchema = z.object({
  frameDataUri: z
    .string()
    .refine(
      d => d.startsWith('data:image/'),
      'Must be an image data URI'
    ),
  description: z.string(),
});

export async function getSceneThumbnail(input: {
  frameDataUri: string;
  description: string;
}) {
  const parsedInput = thumbnailSchema.safeParse(input);
  if (!parsedInput.success) {
    return { error: 'Invalid input provided for thumbnail generation.' };
  }

  try {
    const result = await generateSceneThumbnail(parsedInput.data);
    return { thumbnail: result.thumbnail };
  } catch (e) {
    console.error('Error generating thumbnail:', e);
    return { error: 'Failed to generate scene thumbnail.' };
  }
}
