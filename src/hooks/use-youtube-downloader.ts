import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getYouTubeVideoInfoLocal,
  downloadYouTubeVideoLocal,
  getYouTubeDownloadStatusLocal,
  cancelYouTubeDownloadLocal,
  processYouTubeDownloadLocal,
  getAllYouTubeProjectsLocal,
  getYouTubeDownloadStatsLocal
} from '@/lib/local-actions';

export interface VideoInfo {
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
}

export interface QualityOption {
  id: string;
  label: string;
  resolution: string;
  filesizeFormatted?: string;
}

export interface DownloadProgress {
  status: 'downloading' | 'processing' | 'complete' | 'error';
  percentage?: number;
  downloaded_bytes?: number;
  total_bytes?: number;
  speed?: number;
  eta?: number;
}

export interface DownloadSession {
  id: string;
  url: string;
  status: string;
  progress: DownloadProgress;
  error?: string;
  projectId?: string;
  startTime: number;
  endTime?: number;
}

export interface UseYouTubeDownloaderReturn {
  // Estado
  isLoading: boolean;
  error: string | null;
  videoInfo: VideoInfo | null;
  qualityOptions: QualityOption[];
  downloadSession: DownloadSession | null;
  downloadProgress: DownloadProgress | null;
  
  // Acciones
  getVideoInfo: (url: string) => Promise<void>;
  startDownload: (url: string, options?: {
    quality?: 'highest' | 'high' | 'medium' | 'low';
    format?: string;
    maxFileSize?: number;
  }) => Promise<void>;
  cancelDownload: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
  
  // Utilidades
  isValidYouTubeUrl: (url: string) => boolean;
}

export function useYouTubeDownloader(): UseYouTubeDownloaderReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [downloadSession, setDownloadSession] = useState<DownloadSession | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  // Limpiar interval al desmontar
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setVideoInfo(null);
    setQualityOptions([]);
    setDownloadSession(null);
    setDownloadProgress(null);
    currentSessionIdRef.current = null;
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const isValidYouTubeUrl = useCallback((url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      const validDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
      return validDomains.includes(parsedUrl.hostname);
    } catch {
      return false;
    }
  }, []);

  const getVideoInfo = useCallback(async (url: string) => {
    if (!isValidYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setVideoInfo(null);
    setQualityOptions([]);

    try {
      const result = await getYouTubeVideoInfoLocal({ url });

      if (result.error) {
        if (result.existingProject) {
          setError(`This video already exists in your library: "${result.existingProject.name}"`);
        } else {
          setError(result.error);
        }
        return;
      }

      if (result.videoInfo) {
        setVideoInfo({
          title: result.videoInfo.title,
          uploader: result.videoInfo.uploader,
          duration: result.videoInfo.duration,
          thumbnail: result.videoInfo.thumbnail
        });
      }

      if (result.qualityOptions) {
        setQualityOptions(result.qualityOptions);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get video information');
    } finally {
      setIsLoading(false);
    }
  }, [isValidYouTubeUrl]);

  const startProgressTracking = useCallback((sessionId: string) => {
    currentSessionIdRef.current = sessionId;
    
    // Limpiar interval anterior si existe
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Iniciar seguimiento de progreso
    progressIntervalRef.current = setInterval(async () => {
      try {
        const result = await getYouTubeDownloadStatusLocal({ sessionId });
        
        if (result.error) {
          console.error('Error getting download status:', result.error);
          return;
        }

        if (result.session) {
          setDownloadSession(result.session);
          setDownloadProgress(result.session.progress);

          // Si la descarga se completó o falló, detener el seguimiento
          if (result.session.status === 'complete' || 
              result.session.status === 'error' || 
              result.session.status === 'cancelled') {
            
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }

            // Si se completó, procesar la descarga
            if (result.session.status === 'complete' && result.session.projectId) {
              console.log(`✅ Download completed, project created: ${result.session.projectId}`);
            }
          }
        }
      } catch (err) {
        console.error('Error tracking progress:', err);
      }
    }, 1000); // Actualizar cada segundo
  }, []);

  const startDownload = useCallback(async (url: string, options: {
    quality?: 'highest' | 'high' | 'medium' | 'low';
    format?: string;
    maxFileSize?: number;
  } = {}) => {
    if (!isValidYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setDownloadSession(null);
    setDownloadProgress(null);

    try {
      const result = await downloadYouTubeVideoLocal({
        url,
        quality: options.quality || 'medium',
        format: options.format,
        maxFileSize: options.maxFileSize
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.sessionId) {
        // Iniciar seguimiento de progreso
        startProgressTracking(result.sessionId);
        
        // Procesar la descarga en segundo plano
        processYouTubeDownloadLocal({ sessionId: result.sessionId })
          .catch(err => {
            console.error('Error processing download:', err);
            setError('Failed to process download');
          });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start download');
    } finally {
      setIsLoading(false);
    }
  }, [isValidYouTubeUrl, startProgressTracking]);

  const cancelDownload = useCallback(async () => {
    if (!currentSessionIdRef.current) {
      setError('No active download to cancel');
      return;
    }

    try {
      const result = await cancelYouTubeDownloadLocal({ 
        sessionId: currentSessionIdRef.current 
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      // Limpiar estado
      setDownloadSession(null);
      setDownloadProgress(null);
      currentSessionIdRef.current = null;

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel download');
    }
  }, []);

  return {
    // Estado
    isLoading,
    error,
    videoInfo,
    qualityOptions,
    downloadSession,
    downloadProgress,
    
    // Acciones
    getVideoInfo,
    startDownload,
    cancelDownload,
    clearError,
    reset,
    
    // Utilidades
    isValidYouTubeUrl
  };
}