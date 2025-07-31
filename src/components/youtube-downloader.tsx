"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { YouTubeDownloadForm } from './youtube-download-form';
import { YouTubeDownloadProgress } from './youtube-download-progress';
import { YouTubeErrorHandler } from './youtube-error-handler';
import { YouTubeDownloadNotifications, useDownloadNotifications } from './youtube-download-notifications';
import { YouTubeTroubleshootingGuide } from './youtube-troubleshooting-guide';
import { useToast } from '@/hooks/use-toast';
import { HelpCircle } from 'lucide-react';

interface YouTubeDownloaderProps {
  onProjectCreated?: (projectId: string) => void;
}

interface ActiveDownload {
  sessionId: string;
  url: string;
  videoTitle?: string;
  error?: string;
  retryCount: number;
}

export function YouTubeDownloader({ onProjectCreated }: YouTubeDownloaderProps) {
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [currentError, setCurrentError] = useState<string | undefined>();
  
  const { toast } = useToast();
  const router = useRouter();
  
  const {
    notifications,
    dismissNotification,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
  } = useDownloadNotifications();

  const handleDownloadStart = (sessionId: string, url?: string, videoTitle?: string) => {
    const download: ActiveDownload = {
      sessionId,
      url: url || '',
      videoTitle,
      retryCount: 0
    };
    
    setActiveDownload(download);
    setIsDownloading(true);
    
    notifyInfo('Iniciando Descarga', `Preparando descarga de ${videoTitle || 'video'}...`, {
      url,
      videoTitle
    });

    toast({
      title: "Download Started",
      description: "Your YouTube video download has started",
    });
  };

  const handleDownloadComplete = (projectId: string) => {
    if (activeDownload) {
      notifySuccess(
        'Descarga Completada',
        `"${activeDownload.videoTitle || 'Video'}" se descargó exitosamente`,
        {
          url: activeDownload.url,
          videoTitle: activeDownload.videoTitle,
          projectId
        }
      );
    }

    setIsDownloading(false);
    setActiveDownload(null);
    
    toast({
      title: "Download Complete",
      description: "Your video has been successfully downloaded and added to your library",
    });

    // Notificar al componente padre
    onProjectCreated?.(projectId);
  };

  const handleDownloadCancel = () => {
    if (activeDownload) {
      notifyWarning(
        'Descarga Cancelada',
        `Descarga de "${activeDownload.videoTitle || 'video'}" cancelada por el usuario`,
        {
          url: activeDownload.url,
          videoTitle: activeDownload.videoTitle
        }
      );
    }

    setIsDownloading(false);
    setActiveDownload(null);
    
    toast({
      title: "Download Cancelled",
      description: "The download has been cancelled",
      variant: "destructive",
    });
  };

  const handleDownloadError = (error: string) => {
    if (activeDownload) {
      const updatedDownload = { 
        ...activeDownload, 
        error, 
        retryCount: activeDownload.retryCount + 1 
      };
      setActiveDownload(updatedDownload);
      setCurrentError(error);

      notifyError(
        'Error en Descarga',
        `Error al descargar "${activeDownload.videoTitle || 'video'}": ${error}`,
        {
          url: activeDownload.url,
          videoTitle: activeDownload.videoTitle
        }
      );
    }

    setIsDownloading(false);
    
    toast({
      title: "Download Error",
      description: error,
      variant: "destructive",
    });
  };

  const handleRetryDownload = () => {
    if (activeDownload) {
      // Limpiar error y reiniciar descarga
      const updatedDownload = { ...activeDownload, error: undefined };
      setActiveDownload(updatedDownload);
      setIsDownloading(true);
      
      notifyInfo('Reintentando Descarga', `Reintentando descarga de "${activeDownload.videoTitle || 'video'}"`);
      
      // El componente de formulario manejará el reintento
    }
  };

  const handleNavigateToProject = (projectId: string) => {
    router.push(`/local-project/${projectId}`);
  };

  const handleShowTroubleshooting = (error?: string) => {
    setCurrentError(error);
    setShowTroubleshooting(true);
  };

  const handleDismissError = () => {
    if (activeDownload) {
      const updatedDownload = { ...activeDownload, error: undefined };
      setActiveDownload(updatedDownload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notificaciones */}
      <YouTubeDownloadNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
        onNavigateToProject={handleNavigateToProject}
      />

      {/* Mostrar formulario si no hay descarga activa */}
      {!isDownloading && (
        <YouTubeDownloadForm 
          onDownloadStart={handleDownloadStart}
          onDownloadComplete={handleDownloadComplete}
        />
      )}

      {/* Botón de ayuda */}
      <div className="flex justify-end">
        <button
          onClick={() => handleShowTroubleshooting()}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Guía de Solución de Problemas
        </button>
      </div>

      {/* Mostrar error si existe */}
      {activeDownload?.error && (
        <YouTubeErrorHandler
          error={activeDownload.error}
          url={activeDownload.url}
          onRetry={handleRetryDownload}
          onDismiss={handleDismissError}
          retryCount={activeDownload.retryCount}
          maxRetries={3}
        />
      )}

      {/* Mostrar progreso si hay descarga activa */}
      {isDownloading && activeDownload && (
        <YouTubeDownloadProgress
          sessionId={activeDownload.sessionId}
          onComplete={handleDownloadComplete}
          onCancel={handleDownloadCancel}
          onError={handleDownloadError}
        />
      )}

      {/* Guía de solución de problemas */}
      {showTroubleshooting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <YouTubeTroubleshootingGuide
              currentError={currentError}
              onClose={() => setShowTroubleshooting(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}