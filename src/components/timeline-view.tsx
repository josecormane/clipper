"use client";

import { useState, useEffect, RefObject } from 'react';

type Scene = {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
};

const timeStringToSeconds = (time: string): number => {
  const parts = time.split(':').map(Number);
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else {
    seconds = parts[0] || 0;
  }
  return seconds;
};


interface TimelineViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  scenes: Scene[];
  duration: number;
}

export function TimelineView({ videoRef, scenes, duration }: TimelineViewProps) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateCurrentTime = () => setCurrentTime(video.currentTime);
    
    video.addEventListener('timeupdate', updateCurrentTime);
    
    return () => {
      video.removeEventListener('timeupdate', updateCurrentTime);
    };
  }, [videoRef]);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative w-full h-10 bg-muted rounded-lg overflow-hidden my-4">
      {scenes.map((scene) => {
        const start = timeStringToSeconds(scene.startTime);
        const end = timeStringToSeconds(scene.endTime);
        const left = (start / duration) * 100;
        const width = ((end - start) / duration) * 100;

        return (
          <div
            key={scene.id}
            className="absolute h-full bg-accent/50 hover:bg-accent/80 transition-colors"
            style={{ left: `${left}%`, width: `${width}%` }}
            title={`${scene.description}
${scene.startTime} - ${scene.endTime}`}
          />
        );
      })}
      
      <div 
        className="absolute top-0 h-full w-0.5 bg-primary"
        style={{ left: `${progressPercentage}%` }}
      >
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"/>
      </div>
    </div>
  );
}
