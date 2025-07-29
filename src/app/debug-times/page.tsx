"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DebugTimesPage() {
  const [timeString, setTimeString] = useState('00:01:23.456');
  const [seconds, setSeconds] = useState(0);
  const [convertedBack, setConvertedBack] = useState('');

  // Helper functions (same as in local-actions.ts)
  const timeStringToSeconds = (time: string): number => {
    try {
      const parts = time.split(':');
      const seconds = parseFloat(parts.pop() || '0');
      const minutes = parseInt(parts.pop() || '0', 10);
      const hours = parseInt(parts.pop() || '0', 10);
      return hours * 3600 + minutes * 60 + seconds;
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
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`;
    } catch (error) {
      console.error('Error converting seconds to time string:', totalSeconds, error);
      return '00:00:00.000';
    }
  };

  const handleConvert = () => {
    const secs = timeStringToSeconds(timeString);
    setSeconds(secs);
    setConvertedBack(secondsToTimeString(secs));
  };

  const testChunkAdjustment = () => {
    const chunkStartTime = 240; // 4 minutos
    const sceneTime = '00:01:30.000'; // 1:30 dentro del chunk
    const sceneSeconds = timeStringToSeconds(sceneTime);
    const adjustedSeconds = sceneSeconds + chunkStartTime;
    const adjustedTime = secondsToTimeString(adjustedSeconds);
    
    console.log('Chunk adjustment test:');
    console.log('- Chunk start:', chunkStartTime, 'seconds');
    console.log('- Scene time in chunk:', sceneTime, '=', sceneSeconds, 'seconds');
    console.log('- Adjusted seconds:', adjustedSeconds);
    console.log('- Adjusted time:', adjustedTime);
    
    return {
      chunkStart: chunkStartTime,
      sceneInChunk: sceneTime,
      sceneSeconds,
      adjustedSeconds,
      adjustedTime
    };
  };

  const chunkTest = testChunkAdjustment();

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Debug Time Conversion</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Time Converter */}
        <Card>
          <CardHeader>
            <CardTitle>Time String Converter</CardTitle>
            <CardDescription>
              Test time string to seconds conversion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="time-string">Time String (HH:MM:SS.mmm)</Label>
              <Input
                id="time-string"
                value={timeString}
                onChange={(e) => setTimeString(e.target.value)}
                placeholder="00:01:23.456"
              />
            </div>
            
            <Button onClick={handleConvert} className="w-full">
              Convert
            </Button>
            
            {seconds > 0 && (
              <div className="space-y-2">
                <Alert>
                  <AlertDescription>
                    <strong>Seconds:</strong> {seconds}<br/>
                    <strong>Converted back:</strong> {convertedBack}<br/>
                    <strong>Match:</strong> {timeString === convertedBack ? '✅ Yes' : '❌ No'}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chunk Adjustment Test */}
        <Card>
          <CardHeader>
            <CardTitle>Chunk Adjustment Test</CardTitle>
            <CardDescription>
              How scene times are adjusted for chunks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Chunk starts at:</strong> {chunkTest.chunkStart}s (4:00)</div>
              <div><strong>Scene in chunk:</strong> {chunkTest.sceneInChunk} = {chunkTest.sceneSeconds}s</div>
              <div><strong>Adjusted seconds:</strong> {chunkTest.adjustedSeconds}s</div>
              <div><strong>Final time:</strong> {chunkTest.adjustedTime}</div>
              <div className="pt-2 border-t">
                <strong>Expected:</strong> 00:05:30.000 (4:00 + 1:30)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Time Examples */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Common Time Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                '00:00:00.000',
                '00:00:30.500',
                '00:01:00.000',
                '00:01:30.250',
                '00:02:00.000',
                '00:05:30.000',
                '01:00:00.000',
                '01:23:45.678'
              ].map(time => {
                const secs = timeStringToSeconds(time);
                const back = secondsToTimeString(secs);
                return (
                  <div key={time} className="p-2 border rounded">
                    <div><strong>Input:</strong> {time}</div>
                    <div><strong>Seconds:</strong> {secs}</div>
                    <div><strong>Back:</strong> {back}</div>
                    <div><strong>Match:</strong> {time === back ? '✅' : '❌'}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}