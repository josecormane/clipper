"use client";

import { useState, useEffect, useCallback } from 'react';
import { getProjectLocal } from '@/lib/local-actions';

interface AnalysisProgress {
  isAnalyzing: boolean;
  progress: number;
  currentChunk: number;
  totalChunks: number;
  estimatedTimeRemaining: number;
  error: string | null;
}

export function useAnalysisProgress(projectId: string) {
  const [progress, setProgress] = useState<AnalysisProgress>({
    isAnalyzing: false,
    progress: 0,
    currentChunk: 0,
    totalChunks: 0,
    estimatedTimeRemaining: 0,
    error: null,
  });

  const checkProgress = useCallback(async () => {
    try {
      const { project, error } = await getProjectLocal({ projectId });
      
      if (error || !project) {
        setProgress(prev => ({ ...prev, error: error || 'Project not found' }));
        return;
      }

      const isAnalyzing = project.status === 'analyzing';
      
      setProgress(prev => ({
        ...prev,
        isAnalyzing,
        error: project.status === 'error' ? project.analysisError || 'Analysis failed' : null,
      }));

      return project;
    } catch (error) {
      setProgress(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    // Check immediately
    checkProgress();

    // Set up polling while analyzing
    const interval = setInterval(async () => {
      const project = await checkProgress();
      if (project && project.status !== 'analyzing') {
        clearInterval(interval);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [projectId, checkProgress]);

  const startAnalysis = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      isAnalyzing: true,
      progress: 0,
      error: null,
    }));
  }, []);

  const stopAnalysis = useCallback(() => {
    setProgress(prev => ({
      ...prev,
      isAnalyzing: false,
    }));
  }, []);

  return {
    ...progress,
    startAnalysis,
    stopAnalysis,
    refresh: checkProgress,
  };
}