"use client";

import Image from "next/image";
import { ThumbnailImage } from "@/components/thumbnail-image";
import { useState, useEffect, RefObject } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Clock, Play, RefreshCw, Loader2, CheckSquare, Square, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { timeStringToSeconds, captureFrame } from "@/lib/utils";

type Scene = {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
  thumbnail?: string;
};

interface SceneCardProps {
  scene: Scene;
  onUpdate: (scene: Scene) => void;
  videoRef: RefObject<HTMLVideoElement>;
  onPreview: (scene: Scene) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (sceneId: number) => void;
  onDownload?: (scene: Scene) => void;
}

export function SceneCard({
  scene,
  onUpdate,
  videoRef,
  onPreview,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
  onDownload,
}: SceneCardProps) {
  const [isUpdatingThumbnail, setIsUpdatingThumbnail] = useState(false);
  const [currentThumbnail, setCurrentThumbnail] = useState(scene.thumbnail || "");
  const { toast } = useToast();

  useEffect(() => {
    setCurrentThumbnail(scene.thumbnail || "");
  }, [scene.thumbnail]);

  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    onUpdate({ ...scene, [field]: value });
  };

  const updateThumbnail = async () => {
    if (!videoRef.current) {
        toast({ variant: "destructive", title: "Video player not available." });
        return;
    }

    // readyState < 2 means the video doesn't have enough data to play or seek.
    if (videoRef.current.readyState < 2) {
        toast({
            variant: "destructive",
            title: "Video Not Ready",
            description: "Please wait for the video to load before generating a thumbnail.",
        });
        return;
    }

    setIsUpdatingThumbnail(true);
    try {
      const startTime = timeStringToSeconds(scene.startTime);
      const frameDataUri = await captureFrame(videoRef.current, startTime);
      
      setCurrentThumbnail(frameDataUri);
      // Persist the new thumbnail to the database via the onUpdate callback.
      onUpdate({ ...scene, thumbnail: frameDataUri });

      toast({
        title: "Thumbnail Updated",
        description: "The new thumbnail has been generated and saved.",
      });
    } catch (error) {
      console.error("Failed to update thumbnail:", error);
       toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not refresh the thumbnail. Check console for details.",
      });
    } finally {
      setIsUpdatingThumbnail(false);
    }
  };
  
  const handleCardClick = () => {
    if (selectionMode && onSelectionChange) {
      onSelectionChange(scene.id);
    } else {
      onPreview(scene);
    }
  };

  return (
    <Card className={`overflow-hidden bg-card/80 backdrop-blur-sm w-full transition-all ${
      selectionMode ? 'cursor-pointer hover:bg-accent/50' : ''
    } ${isSelected ? 'ring-2 ring-primary bg-accent/30' : ''}`}>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 relative group cursor-pointer" onClick={handleCardClick}>
          <ThumbnailImage
            key={`${scene.id}-${scene.startTime}-${currentThumbnail?.length || 0}`}
            src={currentThumbnail}
            alt={`Scene ${scene.id}`}
            width={160}
            height={90}
            className="w-full h-full"
          />
          
          {selectionMode ? (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              {isSelected ? (
                <CheckSquare className="h-8 w-8 text-primary" />
              ) : (
                <Square className="h-8 w-8 text-white" />
              )}
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="h-8 w-8 text-white" />
            </div>
          )}
          
          {!selectionMode && (
            <Button 
              size="icon" 
              variant="secondary" 
              className="absolute top-1 right-1 h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                updateThumbnail();
              }}
              disabled={isUpdatingThumbnail}
              title="Update thumbnail to current start time"
            >
              {isUpdatingThumbnail ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
            </Button>
          )}
        </div>
        <div className="col-span-2">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-foreground flex-1">
                {scene.description}
              </p>
              <div className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full min-w-[24px] text-center">
                {scene.id}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label
                  htmlFor={`start-${scene.id}`}
                  className="flex items-center text-xs text-muted-foreground mb-1"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Start
                </Label>
                <Input
                  id={`start-${scene.id}`}
                  value={scene.startTime}
                  onChange={(e) =>
                    handleTimeChange("startTime", e.target.value)
                  }
                  className="h-8"
                  step="0.001"
                />
              </div>
              <div>
                <Label
                  htmlFor={`end-${scene.id}`}
                  className="flex items-center text-xs text-muted-foreground mb-1"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  End
                </Label>
                <Input
                  id={`end-${scene.id}`}
                  value={scene.endTime}
                  onChange={(e) => handleTimeChange("endTime", e.target.value)}
                  className="h-8"
                  step="0.001"
                />
              </div>
            </div>
            
            {!selectionMode && onDownload && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(scene);
                }}
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
