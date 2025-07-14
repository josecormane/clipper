"use client";

import Image from "next/image";
import { useState, useEffect, RefObject } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Clock, Play, Loader2, RefreshCw } from "lucide-react";
import { clipVideo } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { timeStringToSeconds, captureFrame } from "@/lib/utils";

type Scene = {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
  thumbnail: string;
};

interface SceneCardProps {
  scene: Scene;
  onUpdate: (scene: Scene) => void;
  videoDataUri: string | null;
  videoRef: RefObject<HTMLVideoElement>;
  onPreview: (scene: Scene) => void;
}

export function SceneCard({
  scene,
  onUpdate,
  videoDataUri,
  videoRef,
  onPreview,
}: SceneCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdatingThumbnail, setIsUpdatingThumbnail] = useState(false);
  const [currentThumbnail, setCurrentThumbnail] = useState(scene.thumbnail);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentThumbnail(scene.thumbnail);
  }, [scene.thumbnail]);

  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    onUpdate({ ...scene, [field]: value });
  };

  const updateThumbnail = async () => {
    if (!videoRef.current) return;
    setIsUpdatingThumbnail(true);
    try {
      const startTime = timeStringToSeconds(scene.startTime);
      const frameDataUri = await captureFrame(videoRef.current, startTime);
      setCurrentThumbnail(frameDataUri);
      toast({
        title: "Thumbnail Updated",
        description: "The preview image has been refreshed.",
      });
    } catch (error) {
      console.error("Failed to update thumbnail:", error);
       toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not refresh the thumbnail.",
      });
    } finally {
      setIsUpdatingThumbnail(false);
    }
  };

  const handleDownload = async () => {
    if (!videoDataUri) {
      toast({
        variant: "destructive",
        title: "Video data not found",
        description: "Cannot download clip without the original video.",
      });
      return;
    }

    setIsDownloading(true);
    const fileName = `clip_${scene.id}_${scene.startTime.replace(/:/g, "-")}_${scene.endTime.replace(/:/g, "-")}.mp4`;
    const result = await clipVideo({
      videoDataUri,
      startTime: scene.startTime,
      endTime: scene.endTime,
      fileName,
    });
    setIsDownloading(false);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Clipping Failed",
        description: result.error,
      });
    } else if (result.clipDataUri) {
      const link = document.createElement("a");
      link.href = result.clipDataUri;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Download Started",
        description: "Your video clip is downloading.",
      });
    }
  };

  return (
    <Card className="overflow-hidden bg-card/80 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 relative group cursor-pointer" onClick={() => onPreview(scene)}>
          <Image
            src={currentThumbnail}
            alt={`Scene ${scene.id}`}
            width={160}
            height={90}
            className="object-cover w-full h-full"
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
                  disabled={isDownloading}
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
                  disabled={isDownloading}
                  step="0.001"
                />
              </div>
            </div>
          </CardContent>
        </div>
      </div>
      <CardFooter className="bg-muted/30 px-4 py-2 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-accent hover:text-accent hover:bg-accent/10"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isDownloading ? "Clipping..." : "Download"}
        </Button>
      </CardFooter>
    </Card>
  );
}
