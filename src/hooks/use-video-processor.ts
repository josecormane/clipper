"use client";

import { useState, useCallback } from 'react';
import { useApiConfig } from '@/hooks/use-api-config';
import { createVideoProcessor, VideoProcessor } from '@/lib/video-processing';

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  results: any[];
}

export function useVideoProcessor() {
  const { config } = useApiConfig();
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null,
    results: [],
  });

  const processVideoChunks = useCallback(async (chunks: { videoDataUri: string }[]) => {
    // Verificar si hay una API key configurada
    if (!config.isConfigured) {
      const error = 'No hay API key configurada. Por favor configura tu API key de Gemini en la configuración.';
      setState(prev => ({
        ...prev,
        error,
      }));
      throw new Error(error);
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      error: null,
      results: [],
    }));

    try {
      // Crear procesador con la API key configurada
      const processor = createVideoProcessor(config.apiKey);
      
      const results = [];
      
      // Procesar chunks uno por uno para mostrar progreso
      for (let i = 0; i < chunks.length; i++) {
        try {
          const result = await processor.processVideoChunk(chunks[i]);
          results.push(result);
          
          // Actualizar progreso
          setState(prev => ({
            ...prev,
            progress: ((i + 1) / chunks.length) * 100,
            results: [...results],
          }));
        } catch (error) {
          console.error(`Error processing chunk ${i + 1}:`, error);
          results.push({ scenes: [] }); // Chunk vacío en caso de error
        }
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        results,
      }));

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [config]);

  const processVideoChunksInParallel = useCallback(async (chunks: { videoDataUri: string }[]) => {
    // Verificar si hay una API key configurada
    if (!config.isConfigured) {
      const error = 'No hay API key configurada. Por favor configura tu API key de Gemini en la configuración.';
      setState(prev => ({
        ...prev,
        error,
      }));
      throw new Error(error);
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      error: null,
      results: [],
    }));

    try {
      const processor = createVideoProcessor(config.apiKey);
      
      // Procesar todos los chunks en paralelo
      const results = await processor.processChunksInParallel(chunks);
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        results,
      }));

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [config]);

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      progress: 0,
      error: null,
      results: [],
    });
  }, []);

  return {
    ...state,
    processVideoChunks,
    processVideoChunksInParallel,
    reset,
    usingCustomApi: config.isConfigured,
    requiresConfiguration: !config.isConfigured,
  };
}