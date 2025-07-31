"use client";

import { YouTubeDownloader } from '@/components/youtube-downloader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export default function TestYouTubeDownloaderPage() {
  const [createdProjects, setCreatedProjects] = useState<string[]>([]);

  const handleProjectCreated = (projectId: string) => {
    setCreatedProjects(prev => [...prev, projectId]);
    console.log('Project created:', projectId);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">YouTube Downloader Test</h1>
        <p className="text-muted-foreground">
          Test the YouTube download functionality
        </p>
      </div>

      {/* Created Projects Counter */}
      {createdProjects.length > 0 && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Projects Created
              <Badge variant="secondary">{createdProjects.length}</Badge>
            </CardTitle>
            <CardDescription>
              Projects created during this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {createdProjects.map((projectId, index) => (
                <div key={projectId} className="flex items-center justify-between text-sm">
                  <span>Project #{index + 1}</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {projectId.slice(0, 8)}...
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* YouTube Downloader Component */}
      <YouTubeDownloader onProjectCreated={handleProjectCreated} />

      {/* Instructions */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">How to test:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=jNQXAC9IVRw)</li>
              <li>Click "Get Info" to fetch video information</li>
              <li>Select your preferred quality</li>
              <li>Adjust the maximum file size if needed</li>
              <li>Click "Download Video" to start the download</li>
              <li>Monitor the progress in real-time</li>
              <li>The video will be added to your local library when complete</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Test URLs:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div>• https://www.youtube.com/watch?v=jNQXAC9IVRw (Me at the zoo - first YouTube video)</div>
              <div>• https://youtu.be/jNQXAC9IVRw (Short format)</div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Features to test:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>URL validation (try invalid URLs)</li>
              <li>Duplicate detection (try the same video twice)</li>
              <li>Quality selection</li>
              <li>Download progress tracking</li>
              <li>Download cancellation</li>
              <li>Error handling</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}