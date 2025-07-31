"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Gauge,
  HardDrive,
  X
} from 'lucide-react';
import { useYouTubeDownloader, type DownloadSession, type DownloadProgress } from '@/hooks/use-youtube-downloader';
import { getYouTubeDownloadStatusLocal, cancelYouTubeDownloadLocal } from '@/lib/local-actions';

interface YouTubeDownloadProgressProps {
  sessionId: string;
  onComplete?: (projectId: string) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

export function YouTubeDownloadProgress({ 
  sessionId, 
  onComplete, 
  onCancel,
  onError 
}: YouTubeDownloadProgressProps) {
  const [session, setSession] = useState<DownloadSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Polling para actualizar el estado
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateStatus = async () => {
      try {
        const result = await getYouTubeDownloadStatusLocal({ sessionId });
        
        if (result.error) {
          setError(result.error);
          onError?.(result.error);
          return;
        }

        if (result.session) {
          setSession(result.session);
          setIsLoading(false);

          // Verificar si se completó
          if (result.session.status === 'complete' && result.session.projectId) {
            onComplete?.(result.session.projectId);
            clearInterval(interval);
          }

          // Verificar si falló
          if (result.session.status === 'error') {
            setError(result.session.error || 'Download failed');
            onError?.(result.session.error || 'Download failed');
            clearInterval(interval);
          }

          // Verificar si se canceló
          if (result.session.status === 'cancelled') {
            onCancel?.();
            clearInterval(interval);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get download status');
        onError?.(err instanceof Error ? err.message : 'Failed to get download status');
      }
    };

    // Actualizar inmediatamente
    updateStatus();

    // Luego actualizar cada segundo
    interval = setInterval(updateStatus, 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [sessionId, onComplete, onCancel, onError]);

  const handleCancel = async () => {
    try {
      const result = await cancelYouTubeDownloadLocal({ sessionId });
      
      if (result.error) {
        setError(result.error);
        return;
      }

      onCancel?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel download');
    }
  };

  const formatBytes = (bytes?: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond?: number): string => {
    if (!bytesPerSecond) return '0 B/s';
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds?: number): string => {
    if (!seconds || seconds === Infinity) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'downloading':
        return <Download className="h-4 w-4 text-blue-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-orange-600" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'downloading':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-orange-100 text-orange-800';
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'downloading':
        return 'Downloading';
      case 'processing':
        return 'Processing';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading download status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Download session not found</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const progress = session.progress;
  const percentage = progress.percentage || 0;
  const isActive = session.status === 'downloading' || session.status === 'processing';

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(session.status)}
            Download Progress
          </div>
          <Badge className={getStatusColor(session.status)}>
            {getStatusText(session.status)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Session: {sessionId.slice(0, 8)}...
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* URL */}
        <div className="space-y-1">
          <div className="text-sm font-medium">Video URL:</div>
          <div className="text-sm text-muted-foreground break-all">
            {session.url}
          </div>
        </div>

        {/* Progress Bar */}
        {isActive && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{percentage.toFixed(1)}%</span>
            </div>
            <Progress value={percentage} className="w-full" />
          </div>
        )}

        {/* Download Stats */}
        {isActive && progress && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {progress.downloaded_bytes && progress.total_bytes && (
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Downloaded</div>
                  <div className="text-muted-foreground">
                    {formatBytes(progress.downloaded_bytes)} / {formatBytes(progress.total_bytes)}
                  </div>
                </div>
              </div>
            )}

            {progress.speed && (
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Speed</div>
                  <div className="text-muted-foreground">
                    {formatSpeed(progress.speed)}
                  </div>
                </div>
              </div>
            )}

            {progress.eta && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">ETA</div>
                  <div className="text-muted-foreground">
                    {formatTime(progress.eta)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Status</div>
                <div className="text-muted-foreground">
                  {session.status === 'downloading' ? 'Downloading' : 'Processing'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {session.status === 'error' && session.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{session.error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {session.status === 'complete' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Download completed successfully! The video has been added to your library.
            </AlertDescription>
          </Alert>
        )}

        {/* Timing Information */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Started: {new Date(session.startTime).toLocaleTimeString()}</span>
          {session.endTime && (
            <span>
              Duration: {Math.round((session.endTime - session.startTime) / 1000)}s
            </span>
          )}
        </div>

        {/* Cancel Button */}
        {isActive && (
          <div className="flex justify-center">
            <Button 
              onClick={handleCancel}
              variant="destructive"
              size="sm"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Download
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}