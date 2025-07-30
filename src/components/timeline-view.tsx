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
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function TimelineView({ videoRef, scenes, duration, onSplit, onMerge, onSegmentClick, onScenesUpdate, onTimeUpdate, onDragStart, onDragEnd }: TimelineViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());
  const [dragging, setDragging] = useState<{ sceneId: number, handle: 'start' | 'end', initialGap?: number } | null>(null);
  const [localScenes, setLocalScenes] = useState(scenes);
  const [invalidScene, setInvalidScene] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scenesRef = useRef(scenes);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    setLocalScenes(scenes);
    scenesRef.current = scenes;
  }, [scenes]);

  const animate = useCallback(() => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    const handlePause = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    
    // Manejar barra espaciadora para play/pause
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      }
    };

    // Manejar liberación de Cmd/Ctrl para deseleccionar
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setSelectedScenes(new Set());
      }
    };
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', animate);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', animate);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate, videoRef]);
  
  const handleMouseDown = (sceneId: number, handle: 'start' | 'end') => {
    console.log(`🖱️ DRAG START: Scene ${sceneId}, Handle: ${handle}`);
    
    // Log estado inicial de las escenas
    const currentScene = localScenes.find(s => s.id === sceneId);
    const sceneIndex = localScenes.findIndex(s => s.id === sceneId);
    const prevScene = sceneIndex > 0 ? localScenes[sceneIndex - 1] : null;
    const nextScene = sceneIndex < localScenes.length - 1 ? localScenes[sceneIndex + 1] : null;
    
    // Capturar el gap inicial al momento de empezar el arrastre
    let initialGap = 0;
    if (handle === 'start' && prevScene && currentScene) {
      initialGap = timeStringToSeconds(currentScene.startTime) - timeStringToSeconds(prevScene.endTime);
    } else if (handle === 'end' && nextScene && currentScene) {
      initialGap = timeStringToSeconds(nextScene.startTime) - timeStringToSeconds(currentScene.endTime);
    }
    
    console.log(`📊 INITIAL STATE:`);
    if (prevScene) console.log(`  Prev Scene ${prevScene.id}: ${prevScene.startTime} → ${prevScene.endTime}`);
    console.log(`  Current Scene ${currentScene?.id}: ${currentScene?.startTime} → ${currentScene?.endTime}`);
    if (nextScene) console.log(`  Next Scene ${nextScene.id}: ${nextScene.startTime} → ${nextScene.endTime}`);
    console.log(`  Initial Gap: ${initialGap.toFixed(3)}s`);
    
    onDragStart();
    setDragging({ sceneId, handle, initialGap });
  };

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
            
            // Usar el gap capturado al inicio del arrastre
            const gapToPreserve = dragging.initialGap || 0;
            
            // Límites que respetan el gap inicial
            const lowerBound = prevScene ? 
                timeStringToSeconds(prevScene.startTime) + MIN_SCENE_DURATION_SECONDS + gapToPreserve : 0;
            const upperBound = timeStringToSeconds(scene.endTime) - MIN_SCENE_DURATION_SECONDS;
            
            newTime = Math.max(lowerBound, Math.min(newTime, upperBound));
            
            // Actualizar la escena actual
            newScenes[sceneIndex] = { ...scene, startTime: secondsToTimeString(newTime) };
            
            // Actualizar la escena anterior manteniendo el gap inicial
            if (prevScene) {
                const newPrevEndTime = newTime - gapToPreserve;
                newScenes[sceneIndex - 1] = { ...prevScene, endTime: secondsToTimeString(newPrevEndTime) };
            }
            
        } else { // 'end' handle
            const scene = newScenes[sceneIndex];
            const nextScene = sceneIndex < newScenes.length - 1 ? newScenes[sceneIndex + 1] : null;

            // Usar el gap capturado al inicio del arrastre
            const gapToPreserve = dragging.initialGap || 0;

            // Límites que respetan el gap inicial
            const lowerBound = timeStringToSeconds(scene.startTime) + MIN_SCENE_DURATION_SECONDS;
            const upperBound = nextScene ? 
                timeStringToSeconds(nextScene.endTime) - MIN_SCENE_DURATION_SECONDS - gapToPreserve : duration;

            newTime = Math.max(lowerBound, Math.min(newTime, upperBound));

            // Actualizar la escena actual
            newScenes[sceneIndex] = { ...scene, endTime: secondsToTimeString(newTime) };
            
            // Actualizar la escena siguiente manteniendo el gap inicial
            if (nextScene) {
                const newNextStartTime = newTime + gapToPreserve;
                newScenes[sceneIndex + 1] = { ...nextScene, startTime: secondsToTimeString(newNextStartTime) };
            }
        }
        
        scenesRef.current = newScenes;
        return newScenes;
    });

  }, [dragging, duration, onTimeUpdate]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      console.log(`🖱️ DRAG END: Scene ${dragging.sceneId}, Handle: ${dragging.handle}`);
      
      // Log estado final de las escenas
      const sceneIndex = scenesRef.current.findIndex(s => s.id === dragging.sceneId);
      const currentScene = scenesRef.current[sceneIndex];
      const prevScene = sceneIndex > 0 ? scenesRef.current[sceneIndex - 1] : null;
      const nextScene = sceneIndex < scenesRef.current.length - 1 ? scenesRef.current[sceneIndex + 1] : null;
      
      console.log(`📊 FINAL STATE:`);
      if (prevScene) console.log(`  Prev Scene ${prevScene.id}: ${prevScene.startTime} → ${prevScene.endTime}`);
      console.log(`  Current Scene ${currentScene?.id}: ${currentScene?.startTime} → ${currentScene?.endTime}`);
      if (nextScene) console.log(`  Next Scene ${nextScene.id}: ${nextScene.startTime} → ${nextScene.endTime}`);
      
      const changedScenes = scenesRef.current.filter((scene, index) => {
          return scene.startTime !== scenes[index].startTime || scene.endTime !== scenes[index].endTime;
      });
      
      console.log(`📝 CHANGES DETECTED:`);
      changedScenes.forEach(scene => {
        const originalIndex = scenes.findIndex(s => s.id === scene.id);
        const original = scenes[originalIndex];
        console.log(`  Scene ${scene.id}: ${original.startTime} → ${original.endTime} BECAME ${scene.startTime} → ${scene.endTime}`);
      });
      
      console.log(`%cDrag ended. Batch updating ${changedScenes.length} scenes.`, "color: green; font-weight: bold;");
      onScenesUpdate(changedScenes);

      setDragging(null);
      onDragEnd();
    }
  }, [dragging, onScenesUpdate, scenes, onDragEnd]);
  
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
  
  // Función para verificar si las escenas son contiguas
  const areContiguous = (sceneIds: number[]): boolean => {
    if (sceneIds.length <= 1) return true;
    
    const sortedIds = [...sceneIds].sort((a, b) => a - b);
    for (let i = 1; i < sortedIds.length; i++) {
      if (sortedIds[i] - sortedIds[i - 1] !== 1) {
        return false;
      }
    }
    return true;
  };

  const handleSceneClick = (scene: Scene, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
        setSelectedScenes(prev => {
            const newSelection = new Set(prev);
            
            if (newSelection.has(scene.id)) {
                // Deseleccionar escena
                newSelection.delete(scene.id);
            } else {
                // Intentar seleccionar escena
                const testSelection = new Set(newSelection);
                testSelection.add(scene.id);
                
                if (areContiguous(Array.from(testSelection))) {
                    // Escenas son contiguas, permitir selección
                    newSelection.add(scene.id);
                } else {
                    // Escenas no son contiguas, mostrar feedback visual
                    setInvalidScene(scene.id);
                    setTimeout(() => setInvalidScene(null), 500);
                }
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
        {/* Renderizar gaps/padding como áreas vacías */}
        {localScenes.map((scene, index) => {
            if (index === 0) return null; // No hay gap antes de la primera escena
            
            const prevScene = localScenes[index - 1];
            const prevEnd = timeStringToSeconds(prevScene.endTime);
            const currentStart = timeStringToSeconds(scene.startTime);
            
            if (currentStart > prevEnd) {
                // Hay un gap, renderizarlo
                const gapLeft = (prevEnd / duration) * 100;
                const gapWidth = ((currentStart - prevEnd) / duration) * 100;
                
                return (
                    <div
                        key={`gap-${scene.id}`}
                        className="absolute h-full bg-red-200/30 border-l border-r border-red-300/50"
                        style={{ left: `${gapLeft}%`, width: `${gapWidth}%` }}
                        title={`Gap: ${(currentStart - prevEnd).toFixed(2)}s padding`}
                    />
                );
            }
            return null;
        })}
        
        {localScenes.map((scene) => {
            const start = timeStringToSeconds(scene.startTime);
            const end = timeStringToSeconds(scene.endTime);
            const left = (start / duration) * 100;
            const width = ((end - start) / duration) * 100;

            return (
            <div
                key={scene.id}
                className={`absolute h-full transition-colors cursor-pointer flex items-center justify-center rounded-sm
                ${selectedScenes.has(scene.id) 
                  ? 'bg-primary/80' 
                  : invalidScene === scene.id 
                    ? 'bg-gray-400/80' 
                    : 'bg-accent/50 hover:bg-accent/80'
                }`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`Scene ${scene.id}: ${scene.description}
${scene.startTime} - ${scene.endTime}
Click to play, CMD/CTRL+Click to select for merging (only contiguous scenes)`}
                onClick={(e) => handleSceneClick(scene, e)}
            >
                {/* Número de escena */}
                {width > 3 && ( // Solo mostrar el número si hay suficiente espacio
                  <span className="text-xs font-bold text-foreground/80 pointer-events-none select-none">
                    {scene.id}
                  </span>
                )}
                
                <div
                    className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-primary/50"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(scene.id, 'start'); }}
                />
                <div
                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-primary/50"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(scene.id, 'end'); }}
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
