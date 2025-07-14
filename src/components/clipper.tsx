"use client";

import { useState, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getVideoSummary, getSceneThumbnail } from "@/lib/actions";
import { Upload, Wand2, Loader2, Scissors, ThumbsUp } from "lucide-react";
import { SceneCard } from "./scene-card";

type Scene = {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
  thumbnail: string;
};

type RawScene = {
  startTime: string;
  endTime: string;
  description: string;
};

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const timeStringToSeconds = (time: string): number => {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
};

async function captureFrame(videoElement: HTMLVideoElement, time: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement.removeEventListener('error', onError);
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
     const onError = (e: Event) => {
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement.removeEventListener('error', onError);
      reject(new Error('Error seeking video to capture frame.'));
    }
    videoElement.addEventListener('seeked', onSeeked);
    videoElement.addEventListener('error', onError);
    videoElement.currentTime = time;
  });
}

export function Clipper() {
  const { toast } = useToast();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDataUri, setVideoDataUri] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: `Please upload a video under ${MAX_FILE_SIZE_MB}MB.`,
      });
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setSummary(null);
    setScenes([]);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setVideoDataUri(reader.result as string);
    };
    reader.onerror = () => {
       toast({
        variant: "destructive",
        title: "Error reading file",
        description: "Could not read the video file. Please try again.",
      });
    }
  };

  const generateThumbnails = async (rawScenes: RawScene[]) => {
      if (!videoRef.current) return;
      setIsGeneratingThumbnails(true);

      const videoElement = videoRef.current;
      
      const scenesWithThumbnails: Scene[] = [];
      
      // Need to load metadata for duration and dimensions
      videoElement.load();
      await new Promise(resolve => videoElement.onloadedmetadata = resolve);

      for (const [index, scene] of rawScenes.entries()) {
        try {
          const midpointTime = (timeStringToSeconds(scene.startTime) + timeStringToSeconds(scene.endTime)) / 2;
          const frameDataUri = await captureFrame(videoElement, midpointTime);

          const thumbnailResult = await getSceneThumbnail({
            frameDataUri,
            description: scene.description,
          });

          if (thumbnailResult.error) {
              console.error("Error generating thumbnail for scene:", scene.description, thumbnailResult.error);
              scenesWithThumbnails.push({ ...scene, id: index + 1, thumbnail: 'https://placehold.co/160x90.png' });
          } else {
             scenesWithThumbnails.push({ ...scene, id: index + 1, thumbnail: thumbnailResult.thumbnail });
          }
        } catch (e) {
            console.error(`Error processing thumbnail for scene: ${scene.description}`, e);
            scenesWithThumbnails.push({ ...scene, id: index + 1, thumbnail: 'https://placehold.co/160x90.png' });
        }
        // Update state progressively
        setScenes([...scenesWithThumbnails]);
      }
      
      setIsGeneratingThumbnails(false);
  }

  const handleAnalyzeVideo = async () => {
    if (!videoDataUri) {
      toast({
        variant: "destructive",
        title: "No video selected",
        description: "Please upload a video file first.",
      });
      return;
    }
    setIsLoading(true);
    setSummary(null);
    setScenes([]);

    const result = await getVideoSummary({ videoDataUri });
    
    setIsLoading(false);
    if (result.error) {
       toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: result.error,
      });
    } else {
      setSummary(result.summary ?? "No summary generated.");
      if (result.scenes && result.scenes.length > 0) {
        toast({
          title: "Analysis Complete",
          description: "Generating scene thumbnails...",
        });
        // Set scenes with placeholder thumbnails first
        const placeholderScenes = result.scenes.map((scene, index) => ({
          ...scene,
          id: index + 1,
          thumbnail: 'https://placehold.co/160x90.png',
        }));
        setScenes(placeholderScenes);

        // Start generating real thumbnails
        generateThumbnails(result.scenes);
      } else {
        toast({
          title: "Analysis Complete",
          description: "Video summary is ready. No scenes were detected.",
        });
      }
    }
  };
  
  const handleSceneUpdate = (updatedScene: Scene) => {
    setScenes(scenes.map(s => s.id === updatedScene.id ? updatedScene : s));
  }
  
  const allThumbnailsGenerated = !isGeneratingThumbnails && scenes.length > 0;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline">
                <Upload className="text-accent" />
                1. Upload Video
              </CardTitle>
              <CardDescription>
                Select a video file from your device (Max {MAX_FILE_SIZE_MB}MB).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} size="lg" className="w-full">
                <Upload className="mr-2" /> Select Video File
              </Button>
            </CardContent>
          </Card>

          {videoUrl && (
            <Card className="shadow-lg rounded-xl">
              <CardContent className="p-4">
                  <video ref={videoRef} controls src={videoUrl} className="w-full rounded-lg aspect-video" crossOrigin="anonymous" muted playsInline/>
              </CardContent>
            </Card>
          )}

          {videoUrl && (
            <Card className="shadow-lg rounded-xl">
               <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline">
                    <Wand2 className="text-accent" />
                    2. Analyze & Describe
                  </CardTitle>
                  <CardDescription>
                    Let AI analyze the video to generate a summary and detect key scenes.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   <Button onClick={handleAnalyzeVideo} disabled={isLoading} size="lg" className="w-full">
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="mr-2" />
                    )}
                    {isLoading ? "Analyzing..." : "Analyze Video"}
                  </Button>
                </CardContent>
            </Card>
          )}

          {summary && (
             <Card className="shadow-lg rounded-xl">
              <CardHeader>
                <CardTitle className="font-headline">AI Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={summary} readOnly rows={5} className="bg-muted/50" />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-8">
           <Card className="shadow-lg rounded-xl sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                  <Scissors className="text-accent"/>
                  3. Review & Clip Scenes
                </CardTitle>
                <CardDescription>
                  Adjust timestamps and clip the scenes you need.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(isLoading || isGeneratingThumbnails) && (
                  <div className="flex flex-col justify-center items-center h-40">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     <p className="mt-4 text-muted-foreground">
                        {isLoading ? 'Analyzing video...' : 'Generating thumbnails...'}
                     </p>
                  </div>
                )}
                {!isLoading && !isGeneratingThumbnails && scenes.length === 0 && (
                  <div className="text-center text-muted-foreground p-8 rounded-lg border-2 border-dashed">
                    <p>Upload and analyze a video to see scenes here.</p>
                  </div>
                )}
                {scenes.length > 0 && (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {scenes.map((scene) => (
                      <SceneCard key={scene.id} scene={scene} onUpdate={handleSceneUpdate} />
                    ))}
                  </div>
                )}
                {allThumbnailsGenerated && (
                  <Button size="lg" className="w-full mt-6">
                    <ThumbsUp className="mr-2"/>
                    Looks good, let's clip!
                  </Button>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
