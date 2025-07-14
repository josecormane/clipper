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
  startTime: z.string().describe('The start time of the scene in HH:MM:SS.mmm format.'),
  endTime: z.string().describe('The end time of the scene in HH:MM:SS.mmm format.'),
  description: z.string().describe('A concise description of what happens in this scene.'),
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
  prompt: `You are a meticulous video editor's assistant. Your task is to analyze the provided video and break it down into its fundamental visual components.

1.  First, provide a brief, one-sentence summary of the video's overall content.
2.  Then, meticulously identify every distinct visual shot or clip in the video. A new scene begins with every hard cut, change of camera angle, or transition to a different visual asset (like b-roll footage). For each scene, provide:
    - A start time (startTime) in precise HH:MM:SS.mmm format.
    - An end time (endTime) in precise HH:MM:SS.mmm format.
    - A concise description of the visual content in that specific shot.

Your goal is to deconstruct the video into a list of its building blocks.

Video: {{media url=videoDataUri}}`,
});

const generateVideoDescriptionFlow = ai.defineFlow(
  {
    name: 'generateVideoDescriptionFlow',
    inputSchema: GenerateVideoDescriptionInputSchema,
    outputSchema: GenerateVideoDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    // Log the raw output from the AI model for debugging purposes
    console.log('Received from Gemini:', JSON.stringify(output, null, 2));

    if (!output) {
      console.error('Gemini returned a null or undefined output.');
      return { summary: "Error: Failed to get a response from the AI.", scenes: [] };
    }
    
    return output;
  }
);
