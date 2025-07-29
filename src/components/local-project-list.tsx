"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Trash2, 
  Clock, 
  FileVideo, 
  Loader2, 
  AlertCircle,
  HardDrive,
  Folder
} from 'lucide-react';
import { getAllProjectsLocal, deleteProjectLocal, getStorageStatsLocal } from '@/lib/local-actions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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
}

interface StorageStats {
  projectCount: number;
  totalSize: number;
  totalSizeFormatted: string;
}

export function LocalProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      } else {
        setProjects(projectsResult.projects || []);
      }

      if (statsResult.error) {
        console.warn('Failed to get storage stats:', statsResult.error);
      } else {
        setStorageStats(statsResult.stats || null);
      }
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
          title: "Delete Failed",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Project Deleted",
          description: `"${projectName}" has been deleted successfully`,
        });
        fetchProjects(); // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="secondary">Ready to Analyze</Badge>;
      case 'analyzing':
        return <Badge variant="default" className="animate-pulse">Analyzing...</Badge>;
      case 'analyzed':
        return <Badge variant="default">Analyzed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
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
              Local Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span>{storageStats.projectCount} projects</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span>{storageStats.totalSizeFormatted} used</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No local projects found. Upload a video to get started!
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
                  {getStatusBadge(project.status)}
                </div>
                <CardDescription className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(project.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileVideo className="h-3 w-3" />
                    {project.scenes.length} scenes
                  </span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Video Preview */}
                  <video
                    src={project.originalVideoUrl}
                    className="w-full h-32 object-cover rounded-md bg-muted"
                    muted
                    preload="metadata"
                  />
                  
                  {/* Error Message */}
                  {project.status === 'error' && project.analysisError && (
                    <Alert variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        {project.analysisError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Dates */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Created: {formatDate(project.createdAt)}</div>
                    <div>Modified: {formatDate(project.lastModified)}</div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/local-project/${project.id}`}>
                        <Play className="mr-1 h-3 w-3" />
                        Open
                      </Link>
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(project.id, project.name)}
                      disabled={deletingId === project.id}
                    >
                      {deletingId === project.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
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