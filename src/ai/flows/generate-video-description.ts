/**
 * @fileOverview This file implements the video analysis workflow.
 * The process is designed to handle long videos by breaking them into manageable chunks,
 * analyzing each chunk individually, and then aggregating the results.
 */

import { tryGetDefaultAiInstance, hasValidDefaultApiKey } from '@/lib/gemini-config';
import { z } from 'genkit';

// Input schema for the video chunk processing task.
const ProcessVideoChunkInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video clip chunk, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});

// Schema for a single, granular visual shot (a "scene" in our UI).
const ShotSchema = z.object({
  startTime: z.string().describe('The start time of the visual shot in HH:MM:SS.mmm format.'),
  endTime: z.string().describe('The end time of the visual shot in HH:MM:SS.mmm format.'),
  description: z.string().describe('A very brief, telegraphic-style description of the visual content (e.g., "man at computer," "robots playing soccer").'),
});

// The prompt text is now focused on analyzing a single video chunk.
const PROMPT_TEXT = `Video: {{media url=videoDataUri}}

You are a meticulous video editor's assistant. Your task is to deconstruct the provided video clip into a granular list of every single visual cut it contains.

IMPORTANT: The video provided is a short chunk of a much longer video. Your analysis must be confined to this chunk only.

Format your response as a JSON object with a single key: "scenes".
The "scenes" key must contain an array of all the visual shots you identified in this chunk, in chronological order.

For each shot in the 'scenes' array, provide:
- \`startTime\` and \`endTime\` in precise \`HH:MM:SS.mmm\` format, relative to the start of THIS CHUNK.
- A very brief, telegraphic-style description of the visual content (e.g., "man at computer," "robots playing soccer," "close-up on screen"). Use as few words as possible.

Do not create a "summary". Your entire response should be the JSON object.`;

/**
 * Function to get or create the prompt definition lazily
 */
function getVideoChunkAnalysisPrompt() {
  const ai = tryGetDefaultAiInstance();
  if (!ai) {
    throw new Error('No valid Gemini API key configured. Please set up your API key in the settings.');
  }
  
  return ai.definePrompt({
    name: 'videoChunkAnalysisPrompt',
    input: { schema: ProcessVideoChunkInputSchema },
    output: {
      schema: z.object({ scenes: z.array(ShotSchema) }),
    },
    prompt: PROMPT_TEXT,
    config: { maxOutputTokens: 8192 },
  });
}



/**
 * Direct function for server actions (no Proxy)
 */
export async function processVideoChunkFlow(input: { videoDataUri: string }) {
  'use server';
  console.log('=============== PROMPT SENT TO GEMINI FOR CHUNK ===============');
  console.log(PROMPT_TEXT.substring(0, 500) + '...');
  console.log('===========================================================');
  
  try {
    // Verificar si hay una API key válida antes de procesar
    if (!hasValidDefaultApiKey()) {
      throw new Error('No valid default Gemini API key configured. Please configure your API key or use the custom API endpoint.');
    }

    const ai = tryGetDefaultAiInstance();
    if (!ai) {
      throw new Error('No valid Gemini API key configured. Please set up your API key in the settings.');
    }

    // Crear el prompt directamente
    const videoChunkAnalysisPrompt = ai.definePrompt({
      name: 'videoChunkAnalysisPrompt',
      input: { schema: ProcessVideoChunkInputSchema },
      output: {
        schema: z.object({ scenes: z.array(ShotSchema) }),
      },
      prompt: PROMPT_TEXT,
      config: { maxOutputTokens: 8192 },
    });

    const { output } = await videoChunkAnalysisPrompt(input);

    console.log(`=============== RESPONSE FROM GEMINI FOR CHUNK (Found ${output?.scenes.length || 0} scenes) ===============`);

    if (!output) {
      console.error('Gemini returned a null or undefined output for the chunk.');
      return { scenes: [] };
    }
    
    return output;
  } catch (error) {
    console.error('Error processing video chunk:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error('No se pudo procesar el video. Por favor configura tu API key de Gemini en la configuración.');
    }
    
    throw error;
  }
}
