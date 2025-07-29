"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getAllProjectsLocal } from '@/lib/local-actions';
import { RefreshCw, Bug, Clock, FileVideo } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
  scenes: any[];
  duration: number;
  lastModified: string;
}

export default function DebugAnalysisPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { projects: projectList } = await getAllProjectsLocal();
      setProjects(projectList || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const timeStringToSeconds = (time: string): number => {
    try {
      const parts = time.split(':');
      const seconds = parseFloat(parts.pop() || '0');
      const minutes = parseInt(parts.pop() || '0', 10);
      const hours = parseInt(parts.pop() || '0', 10);
      return hours * 3600 + minutes * 60 + seconds;
    } catch (error) {
      return 0;
    }
  };

  const analyzeSceneTimes = (scenes: any[]) => {
    const issues = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const startSeconds = timeStringToSeconds(scene.startTime);
      const endSeconds = timeStringToSeconds(scene.endTime);
      const duration = endSeconds - startSeconds;
      
      // Check for issues
      if (startSeconds >= endSeconds) {
        issues.push(`Scene ${scene.id}: Start time (${scene.startTime}) >= End time (${scene.endTime})`);
      }
      
      if (duration < 0.1) {
        issues.push(`Scene ${scene.id}: Duration too short (${duration.toFixed(3)}s)`);
      }
      
      if (duration > 300) {
        issues.push(`Scene ${scene.id}: Duration very long (${duration.toFixed(1)}s)`);
      }
      
      // Check overlap with next scene
      if (i < scenes.length - 1) {
        const nextScene = scenes[i + 1];
        const nextStartSeconds = timeStringToSeconds(nextScene.startTime);
        
        if (endSeconds > nextStartSeconds) {
          issues.push(`Scene ${scene.id} overlaps with Scene ${nextScene.id}: ${scene.endTime} > ${nextScene.startTime}`);
        }
        
        const gap = nextStartSeconds - endSeconds;
        if (gap > 30) {
          issues.push(`Large gap between Scene ${scene.id} and ${nextScene.id}: ${gap.toFixed(1)}s`);
        }
      }
    }
    
    return issues;
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bug className="h-8 w-8" />
            Analysis Debug Console
          </h1>
          <p className="text-muted-foreground">
            Debug scene timing issues and analysis results
          </p>
        </div>
        <Button onClick={fetchProjects} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Local Projects</CardTitle>
            <CardDescription>
              Select a project to analyze its scene timing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-3 border rounded cursor-pointer transition-colors ${
                      selectedProject?.id === project.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">{project.name}</span>
                      <Badge variant={
                        project.status === 'analyzed' ? 'default' :
                        project.status === 'analyzing' ? 'secondary' :
                        project.status === 'error' ? 'destructive' : 'outline'
                      }>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(project.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileVideo className="h-3 w-3" />
                        {project.scenes.length} scenes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <Card>
          <CardHeader>
            <CardTitle>Scene Analysis</CardTitle>
            <CardDescription>
              Timing issues and scene details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedProject ? (
              <div className="space-y-4">
                {/* Project Info */}
                <div className="p-3 bg-muted rounded">
                  <div className="font-medium">{selectedProject.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedProject.scenes.length} scenes • {formatTime(selectedProject.duration)} total
                  </div>
                </div>

                {/* Issues */}
                {selectedProject.status === 'analyzed' && (
                  <div>
                    <h4 className="font-medium mb-2">Timing Issues</h4>
                    {(() => {
                      const issues = analyzeSceneTimes(selectedProject.scenes);
                      return issues.length > 0 ? (
                        <div className="space-y-1">
                          {issues.map((issue, index) => (
                            <div key={index} className="text-xs p-2 bg-destructive/10 text-destructive rounded">
                              {issue}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs p-2 bg-green-100 text-green-700 rounded">
                          ✅ No timing issues detected
                        </div>
                      );
                    })()}
                  </div>
                )}

                <Separator />

                {/* Scene Details */}
                <div>
                  <h4 className="font-medium mb-2">Scene Details</h4>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {selectedProject.scenes.map((scene, index) => {
                        const startSeconds = timeStringToSeconds(scene.startTime);
                        const endSeconds = timeStringToSeconds(scene.endTime);
                        const duration = endSeconds - startSeconds;
                        
                        return (
                          <div key={scene.id} className="text-xs p-2 border rounded">
                            <div className="font-medium">Scene {scene.id}</div>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <div>Start: {scene.startTime} ({startSeconds}s)</div>
                              <div>End: {scene.endTime} ({endSeconds}s)</div>
                              <div>Duration: {duration.toFixed(3)}s</div>
                              <div className={duration < 0 ? 'text-destructive' : duration > 60 ? 'text-yellow-600' : 'text-green-600'}>
                                {duration < 0 ? '❌ Invalid' : duration > 60 ? '⚠️ Long' : '✅ OK'}
                              </div>
                            </div>
                            <div className="mt-1 text-muted-foreground truncate">
                              "{scene.description}"
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Raw Data */}
                <div>
                  <h4 className="font-medium mb-2">Raw Scene Data</h4>
                  <Textarea
                    value={JSON.stringify(selectedProject.scenes, null, 2)}
                    readOnly
                    className="font-mono text-xs h-32"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a project to analyze its scenes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}