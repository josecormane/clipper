"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, updateProject, deleteProject, clipVideo, analyzeProject, generateThumbnail } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { SceneCard } from '@/components/scene-card';
import { TimelineView } from '@/components/timeline-view';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Trash2, Download, Wand2, AlertTriangle, RefreshCw } from 'lucide-react';
import { saveAs } from 'file-saver';
import { timeStringToSeconds, secondsToTimeString } from '@/lib/utils';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { ReprocessConfirmationModal } from '@/components/reprocess-confirmation-modal';

type Scene = {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
  thumbnail?: string; 
};

type Project = {
  id: string;
  name: string;
  originalVideoUrl: string;
  scenes: Scene[];
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'error';
  analysisError?: string;
  lastModified?: string;
};

export default function ProjectPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isReprocessModalOpen, setIsReprocessModalOpen] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [targetSceneIndex, setTargetSceneIndex] = useState(0);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopPlaybackRef = useRef<number | null>(null);
  const sceneCardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const projectRef = useRef(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const fetchProjectData = useCallback(async () => {
    setIsLoading(true);
    const { project: data, error } = await getProject({ projectId });
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Failed to load project', description: error || 'Project not found.' });
      router.push('/');
    } else {
      setProject(data as Project);
      if ((data as Project).status === 'analyzing') {
        setIsAnalyzing(true);
      } else {
        setIsAnalyzing(false);
      }
    }
    setIsLoading(false);
  }, [projectId, router, toast]);

  useEffect(() => {
    if (!projectId) return;
    
    fetchProjectData();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && (project?.status === 'analyzing' || isReprocessing)) {
        fetchProjectData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, fetchProjectData, project?.status, isReprocessing]);

  useEffect(() => {
    if (!carouselApi) return;
    
    if (targetSceneIndex !== carouselApi.selectedScrollSnap()) {
      carouselApi.scrollTo(targetSceneIndex, true);
    }
  }, [targetSceneIndex, carouselApi]);

  useEffect(() => {
    if (!videoRef.current || !projectRef.current?.scenes.length || !carouselApi) {
      return;
    }
    
    let timeout: NodeJS.Timeout;

    const handleTimeUpdate = () => {
      if (isUserInteracting) return;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!videoRef.current || !projectRef.current?.scenes.length) return;
        
        const currentTime = videoRef.current.currentTime;
        const currentSceneIndex = projectRef.current.scenes.findIndex(scene => {
          const start = timeStringToSeconds(scene.startTime);
          const end = timeStringToSeconds(scene.endTime);
          return currentTime >= start && currentTime < end;
        });

        if (currentSceneIndex !== -1) {
          setTargetSceneIndex(currentSceneIndex);
        }
      }, 200);
    };

    const onPointerDown = () => setIsUserInteracting(true);
    const onSettle = () => {
      setIsUserInteracting(false);
      setTargetSceneIndex(carouselApi.selectedScrollSnap());
    };

    videoRef.current.addEventListener("timeupdate", handleTimeUpdate);
    carouselApi.on("pointerDown", onPointerDown);
    carouselApi.on("settle", onSettle);

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("timeupdate", handleTimeUpdate);
      }
      if (timeout) clearTimeout(timeout);
      carouselApi.off("pointerDown", onPointerDown);
      carouselApi.off("settle", onSettle);
    };
  }, [carouselApi, isUserInteracting]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleAnalyzeClick = async () => {
    if (!project) return;
    setIsAnalyzing(true);
    toast({ title: "Analysis Started", description: "This may take a few minutes." });
    const { error } = await analyzeProject({ projectId, videoUrl: project.originalVideoUrl });
    if (error) {
      toast({ variant: 'destructive', title: 'Analysis Failed', description: error });
    }
    fetchProjectData();
  };
  
  const handleReprocessConfirm = async () => {
    if (!project) return;
    setIsReprocessModalOpen(false);
    setIsReprocessing(true);
    setProject(p => p ? { ...p, scenes: [] } : null);
    
    await updateProject({ projectId, scenes: [] });
    
    const { error } = await analyzeProject({ projectId, videoUrl: project.originalVideoUrl });
    if (error) {
      toast({ variant: 'destructive', title: 'Reprocessing Failed', description: error });
    }
    
    await fetchProjectData();
    setIsReprocessing(false);
  };

  const handleSegmentClick = (startTime: string, endTime: string) => {
    if (!videoRef.current || !project) return;

    if (stopPlaybackRef.current) {
      cancelAnimationFrame(stopPlaybackRef.current);
    }
    
    const video = videoRef.current;
    const startTimeInSeconds = timeStringToSeconds(startTime);
    const endTimeInSeconds = timeStringToSeconds(endTime);
    video.currentTime = startTimeInSeconds;
    video.play();
    
    const checkTime = () => {
      if (video.currentTime >= endTimeInSeconds) {
        video.pause();
        video.currentTime = endTimeInSeconds;
        if (stopPlaybackRef.current) {
          cancelAnimationFrame(stopPlaybackRef.current);
          stopPlaybackRef.current = null;
        }
      } else {
        stopPlaybackRef.current = requestAnimationFrame(checkTime);
      }
    };
  
    stopPlaybackRef.current = requestAnimationFrame(checkTime);

    const clickedSceneIndex = project.scenes.findIndex(
      (s) => s.startTime === startTime && s.endTime === endTime
    );
    if (clickedSceneIndex !== undefined && clickedSceneIndex !== -1) {
      setTargetSceneIndex(clickedSceneIndex);
    }
  };
  
  const autosave = useCallback(async (scenes: Scene[]) => {
    if (!project) return;
    setProject({ ...project, scenes });
    await updateProject({ projectId, scenes });
  }, [project, projectId]);

  const handleScenesUpdate = useCallback((updatedScenes: Scene[]) => {
    if (!projectRef.current) return;
    
    let newScenes = [...projectRef.current.scenes];
    updatedScenes.forEach(updatedScene => {
      const index = newScenes.findIndex(s => s.id === updatedScene.id);
      if (index !== -1) {
        newScenes[index] = updatedScene;
      }
    });

    autosave(newScenes);
  }, [autosave]);

  const handleSplit = useCallback(async (sceneId: number, splitTime: number) => {
    if (!project) return;
    const sceneToSplitIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneToSplitIndex === -1) return;

    const sceneToSplit = project.scenes[sceneToSplitIndex];
    const splitTimeStr = secondsToTimeString(splitTime);

    if (splitTimeStr <= sceneToSplit.startTime || splitTimeStr >= sceneToSplit.endTime) {
      toast({ variant: 'destructive', title: 'Invalid split time', description: 'Split time must be between scene start and end times.' });
      return;
    }

    const newScene: Scene = { id: Date.now(), startTime: splitTimeStr, endTime: sceneToSplit.endTime, description: "New scene" };
    const updatedOldScene = { ...sceneToSplit, endTime: splitTimeStr };

    const { thumbnail: newSceneThumbnail } = await generateThumbnail({ videoPath: project.originalVideoUrl, scene: { ...newScene, startTime: newScene.startTime } });
    if (newSceneThumbnail) {
      newScene.thumbnail = newSceneThumbnail;
    }

    const { thumbnail: updatedOldSceneThumbnail } = await generateThumbnail({ videoPath: project.originalVideoUrl, scene: { ...updatedOldScene, startTime: updatedOldScene.startTime } });
    if (updatedOldSceneThumbnail) {
      updatedOldScene.thumbnail = updatedOldSceneThumbnail;
    }
    
    let newScenes = [...project.scenes];
    newScenes[sceneToSplitIndex] = updatedOldScene;
    newScenes.splice(sceneToSplitIndex + 1, 0, newScene);
    
    autosave(newScenes.map((s, i) => ({ ...s, id: i + 1 })));
  }, [project, autosave, toast]);

  const handleMerge = useCallback((sceneIds: number[]) => {
    if (!project) return;
    const scenesToMerge = project.scenes.filter(s => sceneIds.includes(s.id)).sort((a,b) => timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime));
    if (scenesToMerge.length < 2) return;

    const firstScene = scenesToMerge[0];
    const lastScene = scenesToMerge[scenesToMerge.length - 1];
    
    const mergedScene: Scene = { id: firstScene.id, startTime: firstScene.startTime, endTime: lastScene.endTime, description: scenesToMerge.map(s => s.description).join(' / ') };
    const remainingScenes = project.scenes.filter(s => !sceneIds.includes(s.id));
    
    autosave([...remainingScenes, mergedScene].sort((a,b) => timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime)).map((s, i) => ({ ...s, id: i + 1 })));
  }, [project, autosave]);
  
  const handleDownloadAll = async () => {
    if (!project) return;
    setIsDownloading(true);

    for (const scene of project.scenes) {
      const clipResult = await clipVideo({ videoUrl: project.originalVideoUrl, startTime: scene.startTime, endTime: scene.endTime });
      if (clipResult.error) {
        toast({ variant: 'destructive', title: `Failed to clip scene ${scene.id}`, description: clipResult.error });
        continue;
      }
      saveAs(clipResult.clipDataUri!, `${project.name}-scene-${scene.id}.mp4`);
    }
    setIsDownloading(false);
  };
  
  const handleTimeUpdateFromTimeline = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleDragStart = () => {
    if (videoRef.current && !videoRef.current.paused) {
      setWasPlayingBeforeDrag(true);
      videoRef.current.pause();
    }
  };

  const handleDragEnd = () => {
    if (videoRef.current && wasPlayingBeforeDrag) {
      videoRef.current.play();
      setWasPlayingBeforeDrag(false);
    }
  };

  if (isLoading && !isReprocessing) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  if (!project) return null;
  
  const showTimeline = project.scenes.length > 0 && videoDuration > 0 && !isReprocessing;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex justify-between items-center p-4 border-b">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center space-x-2">
          <Button variant="destructive" onClick={async () => { await deleteProject({ projectId }); router.push('/'); }}><Trash2 className="mr-2" />Delete</Button>
        </div>
      </header>

      <main className="flex-grow p-6">
        <div className="w-full max-w-5xl mx-auto">
          <video ref={videoRef} controls src={project.originalVideoUrl} className="w-full rounded-lg aspect-video mb-4 max-h-[45vh]" crossOrigin="anonymous" onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)} />
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <div className="text-sm text-muted-foreground mt-1">
                {videoDuration > 0 && <span>Video Length: {secondsToTimeString(videoDuration)}</span>}
                {project.lastModified && <span className="ml-4">Last Modified: {new Date(project.lastModified).toLocaleString()}</span>}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {project.status === 'uploaded' && (
                <Button onClick={handleAnalyzeClick} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                  Analyze Project
                </Button>
              )}
              {project.status === 'analyzed' && (
                 <Button variant="outline" onClick={() => setIsReprocessModalOpen(true)} disabled={isReprocessing}>
                    {isReprocessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2"/>}
                    Reprocess
                </Button>
              )}
              <Button onClick={handleDownloadAll} disabled={isDownloading || isReprocessing || project.scenes.length === 0}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2"/>}
                Download All Scenes
              </Button>
            </div>
          </div>

          {showTimeline && (
            <TimelineView
              videoRef={videoRef}
              scenes={project.scenes}
              duration={videoDuration}
              onSplit={handleSplit}
              onMerge={handleMerge}
              onSegmentClick={handleSegmentClick}
              onScenesUpdate={handleScenesUpdate}
              onTimeUpdate={handleTimeUpdateFromTimeline}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          )}

          {(project.status === 'analyzing' || isReprocessing) && (
            <div className="flex flex-col items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary"/>
              <p className="mt-4 text-muted-foreground">{isReprocessing ? 'Reprocessing video...' : 'Analyzing video...'}</p>
            </div>
          )}
          
          {project.status === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>
                {project.analysisError || "An unknown error occurred."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </main>
      
      {showTimeline && (
        <footer className="w-full p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Carousel
            setApi={setCarouselApi}
            opts={{
              align: "start",
              slidesToScroll: "auto",
            }}
            className="w-full max-w-full"
          >
            <CarouselContent>
              {project.scenes.map((scene, index) => (
                <CarouselItem key={scene.id} className="md:basis-1/2 lg/basis-1/3 xl:basis-1/4">
                  <div ref={(el) => { sceneCardRefs.current[index] = el; }} className="p-1">
                    <SceneCard scene={scene} onUpdate={() => {}} onPreview={() => handleSegmentClick(scene.startTime, scene.endTime)} videoRef={videoRef} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </footer>
      )}
      <ReprocessConfirmationModal isOpen={isReprocessModalOpen} onClose={() => setIsReprocessModalOpen(false)} onConfirm={handleReprocessConfirm} />
    </div>
  );
}
