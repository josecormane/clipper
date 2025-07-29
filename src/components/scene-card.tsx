"use client";

import Image from "next/image";
import { ThumbnailImage } from "@/components/thumbnail-image";
import { useState, useEffect, RefObject } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Clock, Play, RefreshCw, Loader2 } from "lucide-react";
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
}

export function SceneCard({
  scene,
  onUpdate,
  videoRef,
  onPreview,
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
  
  return (
    <Card className="overflow-hidden bg-card/80 backdrop-blur-sm w-full">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 relative group cursor-pointer" onClick={() => onPreview(scene)}>
          <ThumbnailImage
            src={currentThumbnail}
            alt={`Scene ${scene.id}`}
            width={160}
            height={90}
            className="w-full h-full"
          />
           <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="h-8 w-8 text-white" />
           </div>
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
        </div>
        <div className="col-span-2">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              {scene.description}
            </p>
            <div className="grid grid-cols-2 gap-3">
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
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
