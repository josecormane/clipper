import { NextRequest, NextResponse } from 'next/server';
import { createGeminiInstance } from '@/lib/gemini-config';
import { z } from 'zod';

// Esquemas de validación
const ProcessVideoChunkInputSchema = z.object({
  videoDataUri: z.string().describe("A video clip chunk, as a data URI"),
  apiKey: z.string().optional(),
});

const ShotSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  description: z.string(),
});

const PROMPT_TEXT = `Video: {{media url=videoDataUri}}

You are a meticulous video editor's assistant. Your task is to deconstruct the provided video clip into a granular list of every single visual cut it contains.

IMPORTANT: The video provided is a short chunk of a much longer video. Your analysis must be confined to this chunk only.

Format your response as a JSON object with a single key: "scenes".
The "scenes" key must contain an array of all the visual shots you identified in this chunk, in chronological order.

For each shot in the 'scenes' array, provide:
- \`startTime\` and \`endTime\` in precise \`HH:MM:SS.mmm\` format, relative to the start of THIS CHUNK.
- A very brief, telegraphic-style description of the visual content (e.g., "man at computer," "robots playing soccer," "close-up on screen"). Use as few words as possible.

Do not create a "summary". Your entire response should be the JSON object.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoDataUri, apiKey } = ProcessVideoChunkInputSchema.parse(body);

    // Crear instancia de Gemini con la API key proporcionada o la por defecto
    const ai = createGeminiInstance(apiKey);

    // Definir el prompt para esta instancia específica
    const videoChunkAnalysisPrompt = ai.definePrompt({
      name: 'videoChunkAnalysisPrompt',
      input: { schema: z.object({ videoDataUri: z.string() }) },
      output: {
        schema: z.object({ scenes: z.array(ShotSchema) }),
      },
      prompt: PROMPT_TEXT,
      config: { maxOutputTokens: 8192 },
    });

    console.log('=============== PROCESSING VIDEO CHUNK WITH CUSTOM API ===============');
    console.log(`Using ${apiKey ? 'custom' : 'default'} API key`);
    console.log('===========================================================');

    // Procesar el chunk de video
    const { output } = await videoChunkAnalysisPrompt({ videoDataUri });

    if (!output) {
      console.error('Gemini returned a null or undefined output for the chunk.');
      return NextResponse.json({ scenes: [] });
    }

    console.log(`=============== RESPONSE FROM GEMINI (Found ${output.scenes.length} scenes) ===============`);

    return NextResponse.json(output);
  } catch (error) {
    console.error('Error processing video chunk:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process video chunk' },
      { status: 500 }
    );
  }
}