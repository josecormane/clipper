'use server';

/**
 * @fileOverview An AI agent that generates a descriptive summary and identifies scenes in a video clip.
 *
 * - generateVideoDescription - A function that generates a summary and scenes from a video clip.
 * - GenerateVideoDescriptionInput - The input type for the generateVideoDescription function.
 * - GenerateVideoDescriptionOutput - The return type for the generateVideoDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVideoDescriptionInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video clip, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateVideoDescriptionInput = z.infer<typeof GenerateVideoDescriptionInputSchema>;

const SceneSchema = z.object({
  startTime: z.string().describe('The start time of the scene in HH:MM:SS format.'),
  endTime: z.string().describe('The end time of the scene in HH:MM:SS format.'),
  description: z.string().describe('A concise description of what happens in this scene.'),
  thumbnail: z.string().describe("A generated image for the scene's thumbnail, as a data URI.")
});

const GenerateVideoDescriptionOutputSchema = z.object({
  summary: z.string().describe('A descriptive summary of the video clip.'),
  scenes: z.array(SceneSchema).describe('An array of detected scenes from the video.')
});
export type GenerateVideoDescriptionOutput = z.infer<typeof GenerateVideoDescriptionOutputSchema>;

export async function generateVideoDescription(
  input: GenerateVideoDescriptionInput
): Promise<GenerateVideoDescriptionOutput> {
  return generateVideoDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateVideoDescriptionPrompt',
  input: {schema: GenerateVideoDescriptionInputSchema},
  output: {schema: GenerateVideoDescriptionOutputSchema},
  prompt: `You are an expert video editor. You will analyze the provided video clip and perform two tasks:
1. Generate a descriptive summary of the entire video clip.
2. Identify and list key scenes from the video. For each scene, provide:
   - A start time (startTime) in HH:MM:SS format.
   - An end time (endTime) in HH:MM:SS format.
   - A concise description of the scene's content.
   - A generated thumbnail image that visually represents the scene.

Video: {{media url=videoDataUri}}`,
  config: {
    // Gemini 2.0 Flash is required for the inline image generation requested in the prompt.
    model: 'googleai/gemini-2.0-flash-preview',
  }
});

const generateVideoDescriptionFlow = ai.defineFlow(
  {
    name: 'generateVideoDescriptionFlow',
    inputSchema: GenerateVideoDescriptionInputSchema,
    outputSchema: GenerateVideoDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
