'use server';

import { generateVideoDescription, GenerateVideoDescriptionInput } from "@/ai/flows/generate-video-description";
import { z } from "zod";

const actionSchema = z.object({
  videoDataUri: z.string().refine(d => d.startsWith('data:video/'), 'Must be a video data URI'),
});

export async function getVideoSummary(input: GenerateVideoDescriptionInput) {
  const parsedInput = actionSchema.safeParse(input);
  if (!parsedInput.success) {
    console.error("Invalid input for getVideoSummary:", parsedInput.error.format());
    return { error: "Invalid input provided to server." };
  }

  try {
    const result = await generateVideoDescription(parsedInput.data);
    return { summary: result.summary, scenes: result.scenes };
  } catch (e) {
    console.error("Error in generateVideoDescription flow:", e);
    // This could be a more user-friendly error message.
    return { error: "An unexpected error occurred while analyzing the video." };
  }
}
