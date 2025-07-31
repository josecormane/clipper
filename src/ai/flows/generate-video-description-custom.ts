/**
 * @fileOverview Enhanced video analysis workflow with custom API key support.
 * This version allows users to bring their own Gemini API key for video processing.
 */

import { createGeminiInstance } from '@/lib/gemini-config';
import { z } from 'genkit';

// Input schema that includes optional API key
const ProcessVideoChunkInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video clip chunk, as a data URI that must include a MIME type and use Base64 encoding."
    ),
  apiKey: z
    .string()
    .optional()
    .describe("Optional custom Gemini API key. If not provided, uses the default configuration."),
});

// Schema for a single, granular visual shot (a "scene" in our UI).
const ShotSchema = z.object({
  startTime: z.string().describe('The start time of the visual shot in MM:SS.mmm format (e.g., "01:30.250").'),
  endTime: z.string().describe('The end time of the visual shot in MM:SS.mmm format (e.g., "01:35.750").'),
  description: z.string().describe('A very brief, telegraphic-style description of the visual content (e.g., "man at computer," "robots playing soccer").'),
});

const PROMPT_TEXT = `Video: {{media url=videoDataUri}}

You are a meticulous video editor's assistant. Your task is to deconstruct the provided video clip into a granular list of every single visual cut it contains.

IMPORTANT: The video provided is a short chunk of a much longer video. Your analysis must be confined to this chunk only.

Format your response as a JSON object with a single key: "scenes".
The "scenes" key must contain an array of all the visual shots you identified in this chunk, in chronological order.

For each shot in the 'scenes' array, provide:
- \`startTime\` and \`endTime\` in precise \`MM:SS.mmm\` format, where MM is minutes, SS is seconds, and mmm is milliseconds (000-999), relative to the start of THIS CHUNK.
- A very brief, telegraphic-style description of the visual content (e.g., "man at computer," "robots playing soccer," "close-up on screen"). Use as few words as possible.

CRITICAL: Time format must be MM:SS.mmm (note the DOT before milliseconds) where:
- MM = minutes (00-59)
- SS = seconds (00-59) 
- mmm = milliseconds (000-999)

Examples of correct time format:
- "00:00.000" = start of chunk
- "00:05.500" = 5.5 seconds into chunk
- "01:30.250" = 1 minute 30.25 seconds into chunk

WRONG formats to avoid:
- "00:01:300" (uses colon instead of dot)
- "1:30.25" (missing leading zero)
- "90.500" (exceeds 59 seconds)

Do not create a "summary". Your entire response should be the JSON object.`;

/**
 * Enhanced flow that supports custom API keys for video processing.
 */
export async function processVideoChunkWithCustomApiFlow(input: {
  videoDataUri: string;
  apiKey?: string;
}) {
  'use server';
  try {
    // Validate input
    const validatedInput = ProcessVideoChunkInputSchema.parse(input);
    
    // Create AI instance with custom API key if provided
    const ai = createGeminiInstance(validatedInput.apiKey);
    
    // Define the prompt for this specific AI instance
    const videoChunkAnalysisPrompt = ai.definePrompt({
      name: 'videoChunkAnalysisPrompt',
      input: { schema: z.object({ videoDataUri: z.string() }) },
      output: {
        schema: z.object({ scenes: z.array(ShotSchema) }),
      },
      prompt: PROMPT_TEXT,
      config: { maxOutputTokens: 8192 },
    });

    console.log('\n🚀 =============== PROCESSING WITH CUSTOM API FLOW ===============');
    console.log(`🔑 Using ${validatedInput.apiKey ? 'custom' : 'default'} API key`);
    console.log(`📹 Video data URI length: ${validatedInput.videoDataUri.length} characters`);
    console.log('================================================================');
    
    // Process the video chunk
    const { output } = await videoChunkAnalysisPrompt({ 
      videoDataUri: validatedInput.videoDataUri 
    });

    console.log('\n🎯 =============== GEMINI RAW RESPONSE ===============');
    console.log('📄 Full output object:', JSON.stringify(output, null, 2));
    console.log(`📊 Scenes found: ${output?.scenes.length || 0}`);
    
    if (output?.scenes) {
      console.log('\n📝 Individual scenes from Gemini:');
      output.scenes.forEach((scene, index) => {
        console.log(`  ${index + 1}. ${scene.startTime} → ${scene.endTime}`);
        console.log(`     "${scene.description}"`);
      });
    }
    console.log('================================================\n');

    if (!output) {
      console.error('❌ Gemini returned a null or undefined output for the chunk.');
      return { scenes: [] };
    }
    
    return output;
  } catch (error) {
    console.error('Error in processVideoChunkWithCustomApiFlow:', error);
    
    if (error instanceof Error && error.message.includes('API key')) {
      throw new Error('Invalid or missing API key. Please check your Gemini API configuration.');
    }
    
    throw error;
  }
}

