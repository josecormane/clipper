'use server';

/**
 * @fileOverview An AI agent that generates a thumbnail for a video scene.
 *
 * - generateSceneThumbnail - A function that handles the scene thumbnail generation process.
 * - GenerateSceneThumbnailInput - The input type for the generateSceneThumbnail function.
 * - GenerateSceneThumbnailOutput - The return type for the generateSceneThumbnail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSceneThumbnailInputSchema = z.object({
  frameDataUri: z
    .string()
    .describe(
      "A frame from a video, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().describe('The description of the scene.'),
});
export type GenerateSceneThumbnailInput = z.infer<typeof GenerateSceneThumbnailInputSchema>;

const GenerateSceneThumbnailOutputSchema = z.object({
  thumbnail: z.string().describe("A generated image for the scene's thumbnail, as a data URI.")
});
export type GenerateSceneThumbnailOutput = z.infer<typeof GenerateSceneThumbnailOutputSchema>;

export async function generateSceneThumbnail(input: GenerateSceneThumbnailInput): Promise<GenerateSceneThumbnailOutput> {
  return generateSceneThumbnailFlow(input);
}

const generateSceneThumbnailFlow = ai.defineFlow(
  {
    name: 'generateSceneThumbnailFlow',
    inputSchema: GenerateSceneThumbnailInputSchema,
    outputSchema: GenerateSceneThumbnailOutputSchema,
  },
  async ({ frameDataUri, description }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        { media: { url: frameDataUri } },
        { text: `Generate a visually appealing thumbnail representing this scene: ${description}` },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media.url) {
        throw new Error('Image generation failed to produce a data URI.');
    }
    
    return { thumbnail: media.url };
  }
);
