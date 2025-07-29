interface VideoChunk {
  videoDataUri: string;
}

interface Scene {
  startTime: string;
  endTime: string;
  description: string;
}

interface ProcessingResult {
  scenes: Scene[];
}

export class VideoProcessor {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async processVideoChunk(chunk: VideoChunk): Promise<ProcessingResult> {
    try {
      const response = await fetch('/api/process-video-chunk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoDataUri: chunk.videoDataUri,
          apiKey: this.apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process video chunk');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing video chunk:', error);
      throw error;
    }
  }

  async processMultipleChunks(chunks: VideoChunk[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (const chunk of chunks) {
      try {
        const result = await this.processVideoChunk(chunk);
        results.push(result);
      } catch (error) {
        console.error('Error processing chunk:', error);
        // Continuar con los otros chunks incluso si uno falla
        results.push({ scenes: [] });
      }
    }

    return results;
  }

  // Método para procesar chunks en paralelo (más rápido pero usa más recursos)
  async processChunksInParallel(chunks: VideoChunk[]): Promise<ProcessingResult[]> {
    try {
      const promises = chunks.map(chunk => this.processVideoChunk(chunk));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error processing chunks in parallel:', error);
      throw error;
    }
  }
}

// Factory function para crear un procesador con la configuración actual
export function createVideoProcessor(apiKey?: string): VideoProcessor {
  return new VideoProcessor(apiKey);
}