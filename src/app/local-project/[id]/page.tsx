"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getProjectLocal, 
  updateProjectLocal, 
  deleteProjectLocal, 
  clipVideoLocal, 
  analyzeProjectLocal 
} from '@/lib/local-actions';
import { useToast } from '@/hooks/use-toast';
import { useApiConfig } from '@/hooks/use-api-config';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { SceneCard } from '@/components/scene-card';
import { TimelineView } from '@/components/timeline-view';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ApiKeyRequired } from '@/components/api-key-required';
import { Loader2, Trash2, Download, Wand2, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { saveAs } from 'file-saver';
import { timeStringToSeconds, secondsToTimeString } from '@/lib/utils';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { ReprocessConfirmationModal } from '@/components/reprocess-confirmation-modal';
import { AnalysisProgress } from '@/components/analysis-progress';
import { ProjectStats } from '@/components/project-stats';

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
  duration: number;
};

export default function LocalProjectPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isReprocessModalOpen, setIsReprocessModalOpen] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { config } = useApiConfig();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopPlaybackRef = useRef<(() => void) | null>(null);

  const projectId = params.id as string;

  const fetchProjectData = useCallback(async () => {
    setIsLoading(true);
    const { project: data, error } = await getProjectLocal({ projectId });
    if (error || !data) {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to load project', 
        description: error || 'Project not found.' 
      });
      router.push('/local');
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
    fetchProjectData();
  }, [fetchProjectData]);

  // Auto-refresh when analyzing
  useEffect(() => {
    if (project?.status !== 'analyzing' && !isReprocessing) return;

    const interval = setInterval(() => {
      fetchProjectData();
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, fetchProjectData, project?.status, isReprocessing]);

  const handleAnalyzeClick = async () => {
    if (!project) return;
    
    // Verificar si hay API key configurada
    if (!config.isConfigured) {
      toast({ 
        variant: 'destructive', 
        title: 'API Key Required', 
        description: 'Please configure your Gemini API key in the settings before analyzing videos.' 
      });
      return;
    }
    
    setIsAnalyzing(true);
    toast({ title: "Analysis Started", description: "This may take a few minutes." });
    
    const { error } = await analyzeProjectLocal({ 
      projectId, 
      apiKey: config.apiKey
    });
    
    if (error) {
      toast({ variant: 'destructive', title: 'Analysis Failed', description: error });
    }
    
    fetchProjectData();
  };
  
  const handleReprocessConfirm = async () => {
    if (!project) return;
    
    // Verificar si hay API key configurada
    if (!config.isConfigured) {
      toast({ 
        variant: 'destructive', 
        title: 'API Key Required', 
        description: 'Please configure your Gemini API key in the settings before reprocessing videos.' 
      });
      setIsReprocessModalOpen(false);
      return;
    }
    
    setIsReprocessModalOpen(false);
    setIsReprocessing(true);
    setProject(p => p ? { ...p, scenes: [] } : null); // Clear scenes immediately
    
    toast({ title: "Reprocessing Started", description: "This may take a few minutes." });
    
    // Clear existing scenes on the backend
    await updateProjectLocal({ projectId, scenes: [] });
    
    // Trigger re-analysis
    const { error } = await analyzeProjectLocal({ 
      projectId, 
      apiKey: config.apiKey
    });
    
    if (error) {
      toast({ variant: 'destructive', title: 'Reprocessing Failed', description: error });
    }
    
    await fetchProjectData(); // Fetch the latest project data
    setIsReprocessing(false);
  };

  const handleSegmentClick = (startTime: string, endTime: string) => {
    if (!videoRef.current) return;

    if (stopPlaybackRef.current) {
      stopPlaybackRef.current();
    }

    const video = videoRef.current;
    const startSeconds = timeStringToSeconds(startTime);
    const endSeconds = timeStringToSeconds(endTime);

    video.currentTime = startSeconds;
    video.play();

    const checkTime = () => {
      if (video.currentTime >= endSeconds) {
        video.pause();
        return;
      }
      requestAnimationFrame(checkTime);
    };

    stopPlaybackRef.current = () => {
      video.pause();
    };

    requestAnimationFrame(checkTime);
  };

  const autosave = useCallback(async (newScenes: Scene[]) => {
    if (!project) return;
    await updateProjectLocal({ projectId, scenes: newScenes });
    setProject(prev => prev ? { ...prev, scenes: newScenes } : null);
  }, [project, projectId]);

  const handleSceneUpdate = useCallback((sceneId: number, updates: Partial<Scene>) => {
    if (!project) return;
    const newScenes = project.scenes.map(scene => 
      scene.id === sceneId ? { ...scene, ...updates } : scene
    );
    autosave(newScenes);
  }, [project, autosave]);

  const handleSplit = useCallback((sceneId: number, splitTime: number) => {
    if (!project || !sceneId) return;
    const sceneToSplitIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneToSplitIndex === -1) return;

    const sceneToSplit = project.scenes[sceneToSplitIndex];
    const splitTimeStr = secondsToTimeString(splitTime);

    if (splitTimeStr <= sceneToSplit.startTime || splitTimeStr >= sceneToSplit.endTime) {
      toast({ 
        variant: 'destructive', 
        title: 'Invalid split time', 
        description: 'Split time must be between scene start and end times.' 
      });
      return;
    }

    const newScene: Scene = { 
      id: Date.now(), 
      startTime: splitTimeStr, 
      endTime: sceneToSplit.endTime, 
      description: "New scene" 
    };
    const updatedOldScene = { ...sceneToSplit, endTime: splitTimeStr };
    
    let newScenes = [...project.scenes];
    newScenes[sceneToSplitIndex] = updatedOldScene;
    newScenes.splice(sceneToSplitIndex + 1, 0, newScene);
    
    autosave(newScenes.map((s, i) => ({ ...s, id: i + 1 })));
  }, [project, autosave, toast]);

  const handleMerge = useCallback((sceneIds: number[]) => {
    if (!project || sceneIds.length < 2) return;
    const scenesToMerge = project.scenes.filter(s => sceneIds.includes(s.id))
      .sort((a,b) => timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime));
    if (scenesToMerge.length < 2) return;

    const firstScene = scenesToMerge[0];
    const lastScene = scenesToMerge[scenesToMerge.length - 1];
    
    const mergedScene: Scene = { 
      id: firstScene.id, 
      startTime: firstScene.startTime, 
      endTime: lastScene.endTime, 
      description: scenesToMerge.map(s => s.description).join(' / ') 
    };
    const remainingScenes = project.scenes.filter(s => !sceneIds.includes(s.id));
    
    autosave([...remainingScenes, mergedScene]
      .sort((a,b) => timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime))
      .map((s, i) => ({ ...s, id: i + 1 })));
  }, [project, autosave]);
  
  const handleDownloadAll = async () => {
    if (!project) return;
    setIsDownloading(true);

    for (const scene of project.scenes) {
      const clipResult = await clipVideoLocal({ 
        projectId,
        startTime: scene.startTime, 
        endTime: scene.endTime 
      });
      
      if (clipResult.error) {
        toast({ 
          variant: 'destructive', 
          title: `Failed to clip scene ${scene.id}`, 
          description: clipResult.error 
        });
        continue;
      }
      
      saveAs(clipResult.clipDataUri!, `${project.name}-scene-${scene.id}.mp4`);
    }
    setIsDownloading(false);
  };

  if (isLoading && !isReprocessing) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }
  
  if (!project) return null;
  
  const showTimeline = project.scenes.length > 0 && videoDuration > 0 && !isReprocessing;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex justify-between items-center p-4 border-b">
        <div className="flex items-center gap-4">
          <Link href="/local">
            <Logo />
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
            <Database className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Local Project
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="destructive" 
            onClick={async () => { 
              if (confirm('Are you sure you want to delete this project?')) {
                await deleteProjectLocal({ projectId }); 
                router.push('/local'); 
              }
            }}
          >
            <Trash2 className="mr-2" />
            Delete
          </Button>
        </div>
      </header>

      <main className="flex-grow p-6">
        <div className="w-full max-w-5xl mx-auto">
          <video 
            ref={videoRef} 
            controls 
            src={project.originalVideoUrl} 
            className="w-full rounded-lg aspect-video mb-4 max-h-[45vh]" 
            crossOrigin="anonymous" 
            onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)} 
          />
          
          <div className="mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <div className="text-sm text-muted-foreground mt-1">
                  {videoDuration > 0 && (
                    <span>Video Length: {secondsToTimeString(videoDuration)}</span>
                  )}
                  {project.lastModified && (
                    <span className="ml-4">
                      Last Modified: {new Date(project.lastModified).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {project.status === 'uploaded' && (
                  <Button 
                    onClick={handleAnalyzeClick} 
                    disabled={isAnalyzing || !config.isConfigured}
                  >
                    {isAnalyzing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    ) : (
                      <Wand2 className="mr-2 h-4 w-4"/>
                    )}
                    Analyze Project
                  </Button>
                )}
                {project.status === 'analyzed' && (
                   <Button 
                     variant="outline" 
                     onClick={() => setIsReprocessModalOpen(true)} 
                     disabled={isReprocessing || !config.isConfigured}
                   >
                      {isReprocessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                      ) : (
                        <RefreshCw className="mr-2"/>
                      )}
                      Reprocess
                  </Button>
                )}
                <Button 
                  onClick={handleDownloadAll} 
                  disabled={isDownloading || isReprocessing || project.scenes.length === 0}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                  ) : (
                    <Download className="mr-2"/>
                  )}
                  Download All Scenes
                </Button>
              </div>
            </div>
            
            {/* Project Statistics */}
            <ProjectStats project={project} />
          </div>

          {showTimeline && (
            <TimelineView 
              videoRef={videoRef} 
              scenes={project.scenes} 
              duration={videoDuration} 
              onSplit={handleSplit} 
              onMerge={handleMerge} 
              onSegmentClick={handleSegmentClick} 
            />
          )}

          {(project.status === 'analyzing' || isReprocessing) && (
            <AnalysisProgress
              isAnalyzing={true}
              totalDuration={project.duration}
              currentProgress={project.scenes.length * 5} // Rough estimate
            />
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

          {!config.isConfigured && (project.status === 'uploaded' || project.status === 'analyzed') && (
            <div className="mt-6">
              <ApiKeyRequired 
                title="API Key Required for Video Analysis"
                description="To analyze or reprocess videos, you need to configure your Gemini API key."
                showConfigButton={true}
              />
            </div>
          )}
        </div>
      </main>
      
      {showTimeline && (
        <footer className="w-full p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Carousel
            opts={{
              align: "start",
              slidesToScroll: "auto",
            }}
            className="w-full max-w-full"
          >
            <CarouselContent>
              {project.scenes.map((scene) => (
                <CarouselItem key={scene.id} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <div className="p-1">
                    <SceneCard 
                      scene={scene} 
                      onUpdate={handleSceneUpdate} 
                      onPreview={() => handleSegmentClick(scene.startTime, scene.endTime)} 
                      videoRef={videoRef} 
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </footer>
      )}
      
      <ReprocessConfirmationModal 
        isOpen={isReprocessModalOpen} 
        onClose={() => setIsReprocessModalOpen(false)} 
        onConfirm={handleReprocessConfirm} 
      />
    </div>
  );
}