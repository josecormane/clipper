"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestGeminiTimesPage() {
  const [results, setResults] = useState<any[]>([]);

  // Gemini-specific time parser (same as in local-actions.ts)
  const timeStringToSeconds = (time: string): number => {
    try {
      const parts = time.split(':');
      
      if (parts.length === 3) {
        // Gemini format: MM:SS:mmm (where mmm is milliseconds, not decimal seconds)
        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);
        const milliseconds = parseInt(parts[2], 10);
        
        const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
        return totalSeconds;
      } else if (parts.length === 2) {
        // Format: MM:SS
        const minutes = parseInt(parts[0], 10);
        const seconds = parseFloat(parts[1]);
        return minutes * 60 + seconds;
      } else {
        return parseFloat(time) || 0;
      }
    } catch (error) {
      console.error('Error parsing time string:', time, error);
      return 0;
    }
  };

  const secondsToTimeString = (totalSeconds: number): string => {
    try {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      const formattedSeconds = seconds.toFixed(3);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${formattedSeconds.padStart(6, '0')}`;
    } catch (error) {
      return '00:00:00.000';
    }
  };

  // Test cases from the actual Gemini response
  const testCases = [
    { gemini: '00:00:000', expected: '0.000s', description: 'Start of video' },
    { gemini: '00:00:999', expected: '0.999s', description: 'Less than 1 second' },
    { gemini: '00:05:000', expected: '5.000s', description: '5 seconds' },
    { gemini: '00:05:999', expected: '5.999s', description: '5.999 seconds' },
    { gemini: '00:06:000', expected: '6.000s', description: '6 seconds' },
    { gemini: '00:08:999', expected: '8.999s', description: '8.999 seconds' },
    { gemini: '00:09:000', expected: '9.000s', description: '9 seconds' },
    { gemini: '00:11:499', expected: '11.499s', description: '11.499 seconds' },
    { gemini: '00:12:799', expected: '12.799s', description: '12.799 seconds' },
    { gemini: '00:15:199', expected: '15.199s', description: '15.199 seconds' },
    { gemini: '00:48:899', expected: '48.899s', description: 'End of video' },
  ];

  const runTests = () => {
    const testResults = testCases.map(testCase => {
      const parsedSeconds = timeStringToSeconds(testCase.gemini);
      const convertedBack = secondsToTimeString(parsedSeconds);
      const expectedSeconds = parseFloat(testCase.expected);
      
      return {
        ...testCase,
        parsedSeconds,
        convertedBack,
        expectedSeconds,
        isCorrect: Math.abs(parsedSeconds - expectedSeconds) < 0.001,
      };
    });
    
    setResults(testResults);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gemini Time Format Test</h1>
        <p className="text-muted-foreground">
          Test the parser for Gemini's MM:SS:mmm time format
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Format Explanation</CardTitle>
            <CardDescription>
              Gemini returns times in MM:SS:mmm format where mmm is milliseconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Example:</strong> <code>00:05:999</code></div>
              <div><strong>Means:</strong> 0 minutes, 5 seconds, 999 milliseconds = 5.999 seconds</div>
              <div><strong>NOT:</strong> 0 hours, 5 minutes, 999 seconds (which would be 5:16:39)</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Testing parser with actual Gemini response data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runTests} className="mb-4">
              Run Tests
            </Button>
            
            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">
                        {result.gemini} → {result.parsedSeconds.toFixed(3)}s
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={result.isCorrect ? "default" : "destructive"}>
                        {result.isCorrect ? "✅ Correct" : "❌ Wrong"}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        Expected: {result.expected}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-muted rounded">
                  <div className="font-medium">
                    Summary: {results.filter(r => r.isCorrect).length} / {results.length} tests passed
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample Scene Adjustments</CardTitle>
            <CardDescription>
              How scenes would be adjusted with chunk offset
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium mb-2">
                  Chunk 1 (starts at 0s):
                </div>
                {results.slice(0, 5).map((result, index) => (
                  <div key={index} className="text-xs p-2 border rounded">
                    <div>Raw: {result.gemini} = {result.parsedSeconds.toFixed(3)}s</div>
                    <div>Adjusted: {result.convertedBack} (no offset for chunk 1)</div>
                  </div>
                ))}
                
                <div className="text-sm font-medium mb-2 mt-4">
                  If this were Chunk 2 (starts at 240s):
                </div>
                {results.slice(0, 3).map((result, index) => (
                  <div key={index} className="text-xs p-2 border rounded">
                    <div>Raw: {result.gemini} = {result.parsedSeconds.toFixed(3)}s</div>
                    <div>With offset: {secondsToTimeString(result.parsedSeconds + 240)} ({(result.parsedSeconds + 240).toFixed(3)}s)</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}