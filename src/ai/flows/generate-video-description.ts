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

// Schema for a single, granular visual shot.
const ShotSchema = z.object({
  startTime: z.string().describe('The start time of the visual shot in HH:MM:SS.mmm format.'),
  endTime: z.string().describe('The end time of the visual shot in HH:MM:SS.mmm format.'),
  description: z.string().describe('A purely visual, objective description of ONLY what is visible in this specific shot (e.g., "A person is typing on a laptop.").'),
});

// The final output we want for our application is a flat list of all shots.
// The `summary` is now optional to prevent validation errors if the model omits it.
const GenerateVideoDescriptionOutputSchema = z.object({
  summary: z.string().optional().describe('A high-level summary of the entire video clip.'),
  scenes: z.array(ShotSchema).describe('A flattened array of every single visual shot from the entire video.'),
});

export type GenerateVideoDescriptionOutput = z.infer<typeof GenerateVideoDescriptionOutputSchema>;

export async function generateVideoDescription(
  input: GenerateVideoDescriptionInput
): Promise<GenerateVideoDescriptionOutput> {
  return generateVideoDescriptionFlow(input);
}

// Per best practices, the {{media}} block is now at the beginning of the prompt.
const PROMPT_TEXT = `Video: {{media url=videoDataUri}}

You are a meticulous video editor's assistant. Your task is to deconstruct the provided video into a granular list of every single visual cut.

You will perform a two-level analysis. First, you will identify broad thematic scenes. Second, within each theme, you will identify every individual visual shot.

IMPORTANT: Your final JSON output MUST be a single, flat list of all visual shots. Do NOT nest the shots inside themes in the output.

Follow these steps:
1.  **Generate a high-level summary:** Create a one-sentence summary of the video's overall content. This is an optional field.
2.  **Perform the two-level analysis:**
    a. **Identify Thematic Scenes:** Go through the video and identify the major topics or themes (e.g., "Introduction to AI Surgery," "Robot Football Match," "Amazon's Warehouse Automation").
    b. **Identify Visual Shots:** For each thematic scene, meticulously list every single visual cut. A new shot begins with every hard cut, change of camera angle, or transition to a different visual asset (like B-roll or a graphic).
3.  **Format the Final Output:**
    -  The 'summary' key should contain your high-level summary. If you can't generate one, you can omit this key.
    -  The 'scenes' key must contain a single, flat array of ALL the visual shots you identified, in chronological order.
    -  For each shot in the 'scenes' array, provide:
        -  \`startTime\` and \`endTime\` in precise \`HH:MM:SS.mmm\` format.
        -  A very brief, telegraphic-style description of the visual content (e.g., "man at computer," "robots playing soccer," "close-up on screen"). Use as few words as possible.

Analyze the entire video. Do not truncate your analysis. Your token limit is high.`;

const prompt = ai.definePrompt({
  name: 'generateVideoDescriptionPrompt',
  input: {schema: GenerateVideoDescriptionInputSchema},
  output: {schema: GenerateVideoDescriptionOutputSchema},
  prompt: PROMPT_TEXT,
  config: {
    maxOutputTokens: 8192,
  },
});

const generateVideoDescriptionFlow = ai.defineFlow(
  {
    name: 'generateVideoDescriptionFlow',
    inputSchema: GenerateVideoDescriptionInputSchema,
    outputSchema: GenerateVideoDescriptionOutputSchema,
  },
  async input => {
    // Log the prompt being used to be sure of the version.
    console.log('=============== PROMPT SENT TO GEMINI ===============');
    console.log(PROMPT_TEXT);
    console.log('=====================================================');

    try {
      const {output} = await prompt(input);
      
      console.log('=============== RESPONSE FROM GEMINI ===============');
      console.log(JSON.stringify(output, null, 2));
      console.log('====================================================');

      if (!output) {
        console.error('Gemini returned a null or undefined output.');
        return { summary: "Error: Failed to get a response from the AI.", scenes: [] };
      }
      
      return output;
    } catch (e) {
      console.error('Error during prompt execution:', e);
      return { summary: `Error: An exception occurred during AI processing. Details: ${e instanceof Error ? e.message : String(e)}`, scenes: [] };
    }
  }
);
