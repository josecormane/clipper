"use client";

import { useState, useEffect, RefObject } from 'react';
import { Button } from './ui/button';
import { Scissors, Merge } from 'lucide-react';

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
  onSplit: (sceneId: number, splitTime: number) => void;
  onMerge: (sceneIds: number[]) => void;
  onSegmentClick: (startTime: string, endTime: string) => void;
}

export function TimelineView({ videoRef, scenes, duration, onSplit, onMerge, onSegmentClick }: TimelineViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateCurrentTime = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', updateCurrentTime);
    return () => video.removeEventListener('timeupdate', updateCurrentTime);
  }, [videoRef]);

  const handleSceneClick = (scene: Scene, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
        setSelectedScenes(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(scene.id)) {
                newSelection.delete(scene.id);
            } else {
                newSelection.add(scene.id);
            }
            return newSelection;
        });
    } else {
        onSegmentClick(scene.startTime, scene.endTime);
    }
  };

  const handleMergeClick = () => {
    onMerge(Array.from(selectedScenes));
    setSelectedScenes(new Set());
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-2">
        <div className="relative w-full h-10 bg-muted rounded-lg overflow-hidden my-4">
        {scenes.map((scene) => {
            const start = timeStringToSeconds(scene.startTime);
            const end = timeStringToSeconds(scene.endTime);
            const left = (start / duration) * 100;
            const width = ((end - start) / duration) * 100;

            return (
            <div
                key={scene.id}
                className={`absolute h-full transition-colors cursor-pointer border-r-2 border-background
                ${selectedScenes.has(scene.id) ? 'bg-primary/80' : 'bg-accent/50 hover:bg-accent/80'}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${scene.description}
${scene.startTime} - ${scene.endTime}
Click to play, CMD/CTRL+Click to select for merging`}
                onClick={(e) => handleSceneClick(scene, e)}
            />
            );
        })}
        
        <div 
            className="absolute top-0 h-full w-0.5 bg-red-500 cursor-pointer"
            style={{ left: `${progressPercentage}%` }}
            onClick={() => onSplit(scenes.find(s => currentTime >= timeStringToSeconds(s.startTime) && currentTime <= timeStringToSeconds(s.endTime))?.id ?? 0, currentTime)}
        >
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"/>
        </div>
        </div>
        <div className="flex justify-end space-x-2">
            <Button onClick={() => onSplit(scenes.find(s => currentTime >= timeStringToSeconds(s.startTime) && currentTime <= timeStringToSeconds(s.endTime))?.id ?? 0, currentTime)} variant="outline" size="sm">
                <Scissors className="mr-2 h-4 w-4"/>
                Split at Playhead
            </Button>
            <Button onClick={handleMergeClick} disabled={selectedScenes.size < 2} variant="outline" size="sm">
                <Merge className="mr-2 h-4 w-4"/>
                Merge Selected
            </Button>
        </div>
    </div>
  );
}
