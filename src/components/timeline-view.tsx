"use client";

import { useState, useEffect, RefObject, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Scissors, Merge } from 'lucide-react';

type Scene = {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
};

const timeStringToSeconds = (time: string): number => {
  if (!time) return 0;
  const parts = time.split(':').map(Number);
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else {
    seconds = parts[0] || 0;
  }
  return isNaN(seconds) ? 0 : seconds;
};

const secondsToTimeString = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(Math.max(0, seconds).toFixed(3)).padStart(6, '0')}`;
};

const MIN_SCENE_DURATION_SECONDS = 0.1; // 100ms

interface TimelineViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  scenes: Scene[];
  duration: number;
  onSplit: (sceneId: number, splitTime: number) => void;
  onMerge: (sceneIds: number[]) => void;
  onSegmentClick: (startTime: string, endTime: string) => void;
  onScenesUpdate: (scenes: Scene[]) => void;
  onTimeUpdate: (time: number) => void;
}

export function TimelineView({ videoRef, scenes, duration, onSplit, onMerge, onSegmentClick, onScenesUpdate, onTimeUpdate }: TimelineViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());
  const [dragging, setDragging] = useState<{ sceneId: number, handle: 'start' | 'end' } | null>(null);
  const [localScenes, setLocalScenes] = useState(scenes);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scenesRef = useRef(scenes);

  useEffect(() => {
    setLocalScenes(scenes);
    scenesRef.current = scenes;
  }, [scenes]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateCurrentTime = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', updateCurrentTime);
    return () => video.removeEventListener('timeupdate', updateCurrentTime);
  }, [videoRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !timelineRef.current) return;

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const cursorTime = (e.clientX - timelineRect.left) / timelineRect.width * duration;
    onTimeUpdate(cursorTime);

    setLocalScenes(currentLocalScenes => {
        const sceneIndex = currentLocalScenes.findIndex(s => s.id === dragging.sceneId);
        if (sceneIndex === -1) return currentLocalScenes;
        
        const newScenes = [...currentLocalScenes];
        let newTime = cursorTime;

        if (dragging.handle === 'start') {
            const prevScene = sceneIndex > 0 ? newScenes[sceneIndex - 1] : null;
            const scene = newScenes[sceneIndex];
            
            const lowerBound = prevScene ? timeStringToSeconds(prevScene.startTime) + MIN_SCENE_DURATION_SECONDS : 0;
            const upperBound = timeStringToSeconds(scene.endTime) - MIN_SCENE_DURATION_SECONDS;
            
            newTime = Math.max(lowerBound, Math.min(newTime, upperBound));
            
            newScenes[sceneIndex] = { ...scene, startTime: secondsToTimeString(newTime) };
            if (prevScene) {
                newScenes[sceneIndex - 1] = { ...prevScene, endTime: secondsToTimeString(newTime) };
            }
        } else { // 'end' handle
            const scene = newScenes[sceneIndex];
            const nextScene = sceneIndex < newScenes.length - 1 ? newScenes[sceneIndex + 1] : null;

            const lowerBound = timeStringToSeconds(scene.startTime) + MIN_SCENE_DURATION_SECONDS;
            const upperBound = nextScene ? timeStringToSeconds(nextScene.endTime) - MIN_SCENE_DURATION_SECONDS : duration;

            newTime = Math.max(lowerBound, Math.min(newTime, upperBound));

            newScenes[sceneIndex] = { ...scene, endTime: secondsToTimeString(newTime) };
            if (nextScene) {
                newScenes[sceneIndex + 1] = { ...nextScene, startTime: secondsToTimeString(newTime) };
            }
        }
        
        scenesRef.current = newScenes;
        return newScenes;
    });

  }, [dragging, duration, onTimeUpdate]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const changedScenes = scenesRef.current.filter((scene, index) => {
          return scene.startTime !== scenes[index].startTime || scene.endTime !== scenes[index].endTime;
      });
      
      console.log(`%cDrag ended. Batch updating ${changedScenes.length} scenes.`, "color: green; font-weight: bold;");
      onScenesUpdate(changedScenes);

      setDragging(null);
    }
  }, [dragging, onScenesUpdate, scenes]);
  
  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);
  
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
      <div ref={timelineRef} className="relative w-full h-10 bg-muted rounded-lg my-4 cursor-pointer" onMouseLeave={handleMouseUp}>
        {localScenes.map((scene) => {
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
            >
                <div
                    className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-primary/50"
                    onMouseDown={(e) => { e.stopPropagation(); setDragging({ sceneId: scene.id, handle: 'start' }); }}
                />
                <div
                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-primary/50"
                    onMouseDown={(e) => { e.stopPropagation(); setDragging({ sceneId: scene.id, handle: 'end' }); }}
                />
            </div>
            );
        })}
        
        <div 
            className="absolute top-0 h-full w-0.5 bg-red-500"
            style={{ left: `${progressPercentage}%` }}
        >
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full cursor-pointer" onClick={() => onSplit(scenes.find(s => currentTime >= timeStringToSeconds(s.startTime) && currentTime <= timeStringToSeconds(s.endTime))?.id ?? 0, currentTime)}/>
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
