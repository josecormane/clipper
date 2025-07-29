"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, Zap, CheckCircle } from 'lucide-react';

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  totalDuration?: number;
  currentProgress?: number;
  estimatedTimeRemaining?: number;
  currentChunk?: number;
  totalChunks?: number;
}

export function AnalysisProgress({
  isAnalyzing,
  totalDuration = 0,
  currentProgress = 0,
  estimatedTimeRemaining = 0,
  currentChunk = 0,
  totalChunks = 0
}: AnalysisProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isAnalyzing) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  if (!isAnalyzing) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Analyzing Video with Gemini AI
        </CardTitle>
        <CardDescription>
          Processing your video to identify scenes and generate descriptions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <Progress value={currentProgress} className="w-full" />
        </div>

        {/* Chunk Progress */}
        {totalChunks > 1 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing Chunks</span>
              <span>{currentChunk} of {totalChunks}</span>
            </div>
            <Progress value={(currentChunk / totalChunks) * 100} className="w-full" />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">Elapsed Time</div>
              <div className="text-muted-foreground">{formatTime(elapsedTime)}</div>
            </div>
          </div>
          
          {totalDuration > 0 && (
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">Video Duration</div>
                <div className="text-muted-foreground">{formatDuration(totalDuration)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Status Messages */}
        <Alert>
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Current Status:</div>
              {currentChunk > 0 && totalChunks > 0 ? (
                <div>Processing chunk {currentChunk} of {totalChunks}...</div>
              ) : (
                <div>Preparing video for analysis...</div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                This process uses your Gemini API key to analyze video content. 
                Longer videos are processed in chunks for better accuracy.
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>💡 <strong>Tip:</strong> You can safely close this tab - the analysis will continue in the background</div>
          <div>⚡ <strong>Speed:</strong> Analysis time depends on video length and Gemini API response times</div>
        </div>
      </CardContent>
    </Card>
  );
}