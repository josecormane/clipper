"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Youtube, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Clock,
  User,
  Eye,
  HardDrive
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useYouTubeDownloader } from '@/hooks/use-youtube-downloader';

interface YouTubeDownloadFormProps {
  onDownloadStart?: (sessionId: string) => void;
  onDownloadComplete?: (projectId: string) => void;
}

export function YouTubeDownloadForm({ 
  onDownloadStart, 
  onDownloadComplete 
}: YouTubeDownloadFormProps) {
  const [url, setUrl] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<'highest' | 'high' | 'medium' | 'low'>('medium');
  const [maxFileSize, setMaxFileSize] = useState<number>(100); // MB
  const { toast } = useToast();

  const {
    isLoading,
    error,
    videoInfo,
    qualityOptions,
    downloadSession,
    downloadProgress,
    getVideoInfo,
    startDownload,
    cancelDownload,
    clearError,
    reset,
    isValidYouTubeUrl
  } = useYouTubeDownloader();

  // Limpiar error cuando cambia la URL
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [url, clearError]);

  // Notificar cuando inicia la descarga
  useEffect(() => {
    if (downloadSession && onDownloadStart) {
      onDownloadStart(downloadSession.id);
    }
  }, [downloadSession, onDownloadStart]);

  // Notificar cuando se completa la descarga
  useEffect(() => {
    if (downloadSession?.status === 'complete' && downloadSession.projectId && onDownloadComplete) {
      onDownloadComplete(downloadSession.projectId);
    }
  }, [downloadSession, onDownloadComplete]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    
    // Limpiar información previa si la URL cambia significativamente
    if (videoInfo && !value.includes(videoInfo.title)) {
      reset();
    }
  };

  const handleGetVideoInfo = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL (youtube.com or youtu.be)",
        variant: "destructive",
      });
      return;
    }

    await getVideoInfo(url);
  };

  const handleStartDownload = async () => {
    if (!videoInfo) {
      toast({
        title: "Error",
        description: "Please get video information first",
        variant: "destructive",
      });
      return;
    }

    await startDownload(url, {
      quality: selectedQuality,
      maxFileSize: maxFileSize * 1024 * 1024 // Convert MB to bytes
    });

    if (!error) {
      toast({
        title: "Download Started",
        description: `Started downloading "${videoInfo.title}"`,
      });
    }
  };

  const handleCancelDownload = async () => {
    await cancelDownload();
    toast({
      title: "Download Cancelled",
      description: "The download has been cancelled",
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`;
    }
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'highest': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isDownloading = Boolean(downloadSession && 
    (downloadSession.status === 'downloading' || downloadSession.status === 'processing'));

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" />
          Download from YouTube
        </CardTitle>
        <CardDescription>
          Enter a YouTube URL to download the video to your local library
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="youtube-url">YouTube URL</Label>
          <div className="flex gap-2">
            <Input
              id="youtube-url"
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isLoading || isDownloading}
              className="flex-1"
            />
            <Button 
              onClick={handleGetVideoInfo}
              disabled={isLoading || !url.trim() || isDownloading}
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Get Info
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Video Information */}
        {videoInfo && (
          <div className="space-y-4">
            <Separator />
            
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">{videoInfo.title}</h3>
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {videoInfo.uploader}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(videoInfo.duration)}
                </div>
              </div>

              {videoInfo.thumbnail && (
                <div className="relative w-full max-w-md mx-auto">
                  <img 
                    src={videoInfo.thumbnail} 
                    alt={videoInfo.title}
                    className="w-full rounded-lg shadow-sm"
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Quality Selection */}
            <div className="space-y-3">
              <Label>Download Quality</Label>
              
              {/* Show available formats first if we have them */}
              {qualityOptions.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Available formats for this video:
                    </Label>
                    <div className="grid gap-2">
                      {qualityOptions.map((option) => (
                        <Button
                          key={option.id}
                          variant="outline"
                          className="justify-between h-auto p-3"
                          disabled={isDownloading}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {option.resolution}
                            </Badge>
                            <span className="text-sm">{option.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {option.filesizeFormatted}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
                    💡 <strong>Note:</strong> YouTube only provides the formats shown above for this video. 
                    The generic quality options below will automatically select the best available format.
                  </div>
                </div>
              ) : null}
              
              {/* Generic quality options */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Generic quality preferences:
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['highest', 'high', 'medium', 'low'] as const).map((quality) => (
                    <Button
                      key={quality}
                      variant={selectedQuality === quality ? "default" : "outline"}
                      onClick={() => setSelectedQuality(quality)}
                      disabled={isDownloading}
                      className="justify-start"
                    >
                      <Badge 
                        variant="secondary" 
                        className={`mr-2 ${getQualityColor(quality)}`}
                      >
                        {quality.toUpperCase()}
                      </Badge>
                      {quality === 'highest' && 'Best available'}
                      {quality === 'high' && '≤1080p'}
                      {quality === 'medium' && '≤720p'}
                      {quality === 'low' && '≤480p'}
                    </Button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  These options tell yt-dlp to download the best quality available within the selected range.
                </div>
              </div>
            </div>

            {/* File Size Limit */}
            <div className="space-y-2">
              <Label htmlFor="max-file-size">
                Maximum File Size (MB)
              </Label>
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="max-file-size"
                  type="number"
                  min="10"
                  max="2048"
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(Number(e.target.value))}
                  disabled={isDownloading}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">MB</span>
              </div>
            </div>

            <Separator />

            {/* Download Button */}
            <div className="flex gap-2">
              {!isDownloading ? (
                <Button 
                  onClick={handleStartDownload}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Video
                </Button>
              ) : (
                <Button 
                  onClick={handleCancelDownload}
                  variant="destructive"
                  className="flex-1"
                >
                  Cancel Download
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}