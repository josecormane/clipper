"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  FileVideo, 
  Scissors, 
  Calendar,
  BarChart3,
  Zap
} from 'lucide-react';

interface ProjectStatsProps {
  project: {
    name: string;
    duration: number;
    scenes: any[];
    status: string;
    createdAt: string;
    lastModified: string;
  };
}

export function ProjectStats({ project }: ProjectStatsProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed': return 'default';
      case 'analyzing': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'analyzed': return <BarChart3 className="h-4 w-4" />;
      case 'analyzing': return <Zap className="h-4 w-4 animate-pulse" />;
      case 'error': return <FileVideo className="h-4 w-4" />;
      default: return <FileVideo className="h-4 w-4" />;
    }
  };

  const averageSceneDuration = project.scenes.length > 0 
    ? project.duration / project.scenes.length 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Project Statistics</span>
          <Badge variant={getStatusColor(project.status)} className="flex items-center gap-1">
            {getStatusIcon(project.status)}
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Overview of your video project analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Duration */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Duration</div>
              <div className="text-xs text-muted-foreground">
                {formatDuration(project.duration)}
              </div>
            </div>
          </div>

          {/* Scene Count */}
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Scenes</div>
              <div className="text-xs text-muted-foreground">
                {project.scenes.length} detected
              </div>
            </div>
          </div>

          {/* Average Scene Length */}
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Avg Scene</div>
              <div className="text-xs text-muted-foreground">
                {averageSceneDuration > 0 ? formatDuration(averageSceneDuration) : 'N/A'}
              </div>
            </div>
          </div>

          {/* Last Modified */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Modified</div>
              <div className="text-xs text-muted-foreground">
                {formatDate(project.lastModified)}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats for Analyzed Projects */}
        {project.status === 'analyzed' && project.scenes.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-2">Scene Distribution (All {project.scenes.length} scenes)</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {project.scenes.map((scene, index) => (
                <div key={scene.id} className="flex justify-between text-xs p-1 hover:bg-muted/50 rounded">
                  <span className="truncate mr-2 flex-1">
                    <strong>Scene {scene.id}:</strong> {scene.description}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap font-mono text-[10px]">
                    {scene.startTime} → {scene.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}