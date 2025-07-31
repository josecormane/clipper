"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Trash2, 
  Clock, 
  FileVideo, 
  Loader2, 
  AlertCircle,
  HardDrive,
  Folder,
  Youtube,
  Upload,
  User,
  Calendar,
  Eye,
  ExternalLink
} from 'lucide-react';
import { getAllProjectsLocal, deleteProjectLocal, getStorageStatsLocal } from '@/lib/local-actions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface YouTubeMetadata {
  videoId: string;
  uploader: string;
  uploaderUrl?: string;
  uploadDate: string;
  originalTitle: string;
  viewCount?: number;
  likeCount?: number;
  description?: string;
  tags?: string[];
  category?: string;
  thumbnailUrl?: string;
  downloadedFormat?: string;
  downloadedQuality?: string;
}

interface Project {
  id: string;
  name: string;
  originalVideoUrl: string;
  duration: number;
  createdAt: string;
  lastModified: string;
  scenes: any[];
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'error';
  analysisError?: string;
  // Nuevos campos para YouTube
  source: 'upload' | 'youtube';
  sourceUrl?: string;
  youtubeMetadata?: YouTubeMetadata;
}

interface StorageStats {
  projectCount: number;
  totalSize: number;
  totalSizeFormatted: string;
}

export function EnhancedLocalProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<'all' | 'upload' | 'youtube'>('all');
  const { toast } = useToast();

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const [projectsResult, statsResult] = await Promise.all([
        getAllProjectsLocal(),
        getStorageStatsLocal()
      ]);

      if (projectsResult.error) {
        toast({
          title: "Error",
          description: projectsResult.error,
          variant: "destructive",
        });
        return;
      }

      if (statsResult.error) {
        console.warn('Failed to load storage stats:', statsResult.error);
      }

      setProjects(projectsResult.projects || []);
      setStorageStats(statsResult.stats || null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(projectId);
    try {
      const result = await deleteProjectLocal({ projectId });
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Project Deleted",
        description: `"${projectName}" has been deleted successfully`,
      });

      // Refresh the list
      fetchProjects();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'bg-blue-100 text-blue-800';
      case 'analyzing':
        return 'bg-yellow-100 text-yellow-800';
      case 'analyzed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: 'upload' | 'youtube') => {
    return source === 'youtube' ? (
      <Youtube className="h-4 w-4 text-red-600" />
    ) : (
      <Upload className="h-4 w-4 text-blue-600" />
    );
  };

  const getSourceColor = (source: 'upload' | 'youtube') => {
    return source === 'youtube' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-blue-100 text-blue-800';
  };

  const filteredProjects = projects.filter(project => {
    if (filterSource === 'all') return true;
    return project.source === filterSource;
  });

  const youtubeCount = projects.filter(p => p.source === 'youtube').length;
  const uploadCount = projects.filter(p => p.source === 'upload').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading projects...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Stats */}
      {storageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{storageStats.projectCount}</div>
                <div className="text-sm text-muted-foreground">Total Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{uploadCount}</div>
                <div className="text-sm text-muted-foreground">Uploaded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{youtubeCount}</div>
                <div className="text-sm text-muted-foreground">From YouTube</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{storageStats.totalSizeFormatted}</div>
                <div className="text-sm text-muted-foreground">Total Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={filterSource === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSource('all')}
            >
              All ({projects.length})
            </Button>
            <Button
              variant={filterSource === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSource('upload')}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Uploaded ({uploadCount})
            </Button>
            <Button
              variant={filterSource === 'youtube' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterSource('youtube')}
              className="flex items-center gap-2"
            >
              <Youtube className="h-4 w-4" />
              YouTube ({youtubeCount})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {filterSource === 'all' ? 'No projects found' : 
                 filterSource === 'youtube' ? 'No YouTube videos' : 'No uploaded videos'}
              </h3>
              <p className="text-muted-foreground">
                {filterSource === 'all' ? 'Upload a video file or download from YouTube to get started' :
                 filterSource === 'youtube' ? 'Download videos from YouTube to see them here' :
                 'Upload video files to see them here'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header with title and badges */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">{project.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getSourceColor(project.source)}>
                            {getSourceIcon(project.source)}
                            <span className="ml-1">
                              {project.source === 'youtube' ? 'YouTube' : 'Uploaded'}
                            </span>
                          </Badge>
                          <Badge className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatDuration(project.duration)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileVideo className="h-4 w-4" />
                            {project.scenes.length} scenes
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link href={`/local-project/${project.id}`}>
                          <Button size="sm">
                            <Play className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(project.id, project.name)}
                          disabled={deletingId === project.id}
                        >
                          {deletingId === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* YouTube metadata */}
                    {project.source === 'youtube' && project.youtubeMetadata && (
                      <div className="space-y-2">
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Uploader:</span>
                            <span>{project.youtubeMetadata.uploader}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Upload Date:</span>
                            <span>{project.youtubeMetadata.uploadDate}</span>
                          </div>

                          {project.youtubeMetadata.viewCount && (
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Views:</span>
                              <span>{project.youtubeMetadata.viewCount.toLocaleString()}</span>
                            </div>
                          )}

                          {project.youtubeMetadata.downloadedQuality && (
                            <div className="flex items-center gap-2">
                              <FileVideo className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Quality:</span>
                              <span>{project.youtubeMetadata.downloadedQuality}</span>
                            </div>
                          )}
                        </div>

                        {project.sourceUrl && (
                          <div className="flex items-center gap-2 text-sm">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Source:</span>
                            <a 
                              href={project.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-md"
                            >
                              {project.sourceUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Error message */}
                    {project.status === 'error' && project.analysisError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{project.analysisError}</AlertDescription>
                      </Alert>
                    )}

                    {/* Dates */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Created: {formatDate(project.createdAt)}</span>
                      <span>Modified: {formatDate(project.lastModified)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}