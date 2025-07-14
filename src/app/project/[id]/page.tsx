"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getProject, updateProject, deleteProject, clipVideo, analyzeProject, generateThumbnails } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { SceneCard } from '@/components/scene-card';
import { TimelineView } from '@/components/timeline-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Trash2, Download, Wand2, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { saveAs } from 'file-saver';
import { timeStringToSeconds, secondsToTimeString } from '@/lib/utils'; // Import helpers

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
  lastModified?: string; // Add lastModified field
};

export default function ProjectPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());
  
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopPlaybackRef = useRef<(() => void) | null>(null);


  const projectId = params.id as string;

  const fetchProjectData = useCallback(async () => {
    const { project: data, error } = await getProject({ projectId });
    if (error || !data) {
      toast({ variant: 'destructive', title: 'Failed to load project', description: error || 'Project not found.' });
      router.push('/');
    } else {
      setProject(data as Project);
      if((data as Project).status === 'analyzing') setIsAnalyzing(true);
      else setIsAnalyzing(false);
    }
    setIsLoading(false);
  }, [projectId, router, toast]);

  useEffect(() => {
    if (!projectId) return;
    
    fetchProjectData();

    const interval = setInterval(() => {
        if(document.visibilityState === 'visible' && project?.status === 'analyzing') {
            fetchProjectData();
        }
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, fetchProjectData, project?.status]);

  const handleAnalyzeClick = async () => {
    if (!project) return;
    setIsAnalyzing(true);
    toast({ title: "Analysis Started", description: "This may take a few minutes."});
    const { error } = await analyzeProject({ projectId, videoUrl: project.originalVideoUrl });
    if (error) {
        toast({ variant: 'destructive', title: 'Analysis Failed', description: error });
    }
    fetchProjectData();
  };

  const handleGenerateThumbnails = async () => {
    if(!project) return;
    setIsGeneratingThumbs(true);
    toast({ title: "Generating Thumbnails", description: "This may take a moment..."});
    const {error} = await generateThumbnails({ projectId, videoUrl: project.originalVideoUrl });
    if(error) {
        toast({ variant: 'destructive', title: 'Thumbnail Generation Failed', description: error });
    } else {
        toast({ title: 'Thumbnails generated successfully!' });
    }
    setIsGeneratingThumbs(false);
    fetchProjectData();
  };

  const handleSegmentClick = (startTime: string, endTime: string) => {
    if (!videoRef.current) return;

    if (stopPlaybackRef.current) {
        stopPlaybackRef.current();
    }
    
    const video = videoRef.current;
    video.currentTime = timeStringToSeconds(startTime);
    video.play();
    
    const checkTime = () => {
      if (video.currentTime >= timeStringToSeconds(endTime)) {
        video.pause();
        stopPlaybackRef.current = null;
        video.removeEventListener("timeupdate", checkTime);
      }
    };

    stopPlaybackRef.current = () => {
        video.pause();
        video.removeEventListener("timeupdate", checkTime);
    };

    video.addEventListener("timeupdate", checkTime);
  };
  
  const autosave = useCallback(async (scenes: Scene[]) => {
    if (!project) return;
    setProject({ ...project, scenes });
    await updateProject({ projectId, scenes });
  }, [project, projectId]);

  const handleSceneUpdate = useCallback((updatedScene: Scene) => {
    if (!project) return;
    let newScenes = project.scenes.map(s => s.id === updatedScene.id ? updatedScene : s);
    
    const sceneIndex = newScenes.findIndex(s => s.id === updatedScene.id);
    if (sceneIndex > 0) {
        const prevScene = newScenes[sceneIndex - 1];
        if (prevScene.endTime !== updatedScene.startTime) {
            newScenes[sceneIndex - 1] = {...prevScene, endTime: updatedScene.startTime};
        }
    }
    if (sceneIndex < newScenes.length - 1) {
        const nextScene = newScenes[sceneIndex + 1];
        if (nextScene.startTime !== updatedScene.endTime) {
            newScenes[sceneIndex + 1] = {...nextScene, startTime: updatedScene.endTime};
        }
    }
    autosave(newScenes);
  }, [project, autosave]);

  const handleSplit = useCallback((sceneId: number, splitTime: number) => {
    if (!project || !sceneId) return;
    const sceneToSplitIndex = project.scenes.findIndex(s => s.id === sceneId);
    if (sceneToSplitIndex === -1) return;

    const sceneToSplit = project.scenes[sceneToSplitIndex];
    const splitTimeStr = secondsToTimeString(splitTime);

    if (splitTimeStr <= sceneToSplit.startTime || splitTimeStr >= sceneToSplit.endTime) {
      toast({ variant: 'destructive', title: 'Invalid split time' });
      return;
    }

    const newScene: Scene = { id: Date.now(), startTime: splitTimeStr, endTime: sceneToSplit.endTime, description: "New scene" };
    const updatedOldScene = {...sceneToSplit, endTime: splitTimeStr};
    
    let newScenes = [...project.scenes];
    newScenes[sceneToSplitIndex] = updatedOldScene;
    newScenes.splice(sceneToSplitIndex + 1, 0, newScene);
    
    autosave(newScenes.map((s, i) => ({ ...s, id: i + 1 })));
  }, [project, autosave, toast]);

  const handleMerge = useCallback((sceneIds: number[]) => {
    if (!project || sceneIds.length < 2) return;
    const scenesToMerge = project.scenes.filter(s => sceneIds.includes(s.id)).sort((a,b) => timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime));
    if (scenesToMerge.length < 2) return;

    const firstScene = scenesToMerge[0];
    const lastScene = scenesToMerge[scenesToMerge.length - 1];
    
    const mergedScene: Scene = { id: firstScene.id, startTime: firstScene.startTime, endTime: lastScene.endTime, description: scenesToMerge.map(s => s.description).join(' / ') };
    const remainingScenes = project.scenes.filter(s => !sceneIds.includes(s.id));
    
    autosave([...remainingScenes, mergedScene].sort((a,b) => timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime)).map((s, i) => ({ ...s, id: i + 1 })));
  }, [project, autosave]);
  
  const handleDownload = async () => {
    if (!project || selectedScenes.size === 0) return;
    setIsDownloading(true);

    const scenesToDownload = project.scenes.filter(s => selectedScenes.has(s.id));
    for (const scene of scenesToDownload) {
      const { clipDataUri, error } = await clipVideo({ videoUrl: project.originalVideoUrl, startTime: scene.startTime, endTime: scene.endTime });
      if (error || !clipDataUri) {
        toast({ variant: 'destructive', title: `Failed to clip scene ${scene.id}`, description: error });
        continue;
      }
      saveAs(clipDataUri, `${project.name}-scene-${scene.id}.mp4`);
    }
    setIsDownloading(false);
  };

  const handlePreview = (scene: Scene) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timeStringToSeconds(scene.startTime);
    videoRef.current.play();
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin" /></div>;
  if (!project) return null;
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex justify-between items-center mb-8">
        <Button variant="ghost" onClick={() => router.push('/')}><ArrowLeft className="mr-2" />Back</Button>
        <Logo />
        <Button variant="destructive" onClick={async () => { await deleteProject({ projectId }); router.push('/'); }}><Trash2 className="mr-2"/>Delete</Button>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{project.name}</CardTitle>
                    {project.status === 'uploaded' && (
                        <Button onClick={handleAnalyzeClick}>
                            <Wand2 className="mr-2 h-4 w-4"/>
                            Analyze Project
                        </Button>
                    )}
                </div>
                <div className="text-sm text-muted-foreground">
                    {project.lastModified && <p>Last Modified: {new Date(project.lastModified).toLocaleString()}</p>}
                    {videoDuration > 0 && <p>Video Length: {secondsToTimeString(videoDuration)}</p>}
                </div>
            </CardHeader>
            <CardContent>
              <video ref={videoRef} controls src={project.originalVideoUrl} className="w-full rounded-lg aspect-video" crossOrigin="anonymous" onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)} />
              {project.scenes.length > 0 && videoDuration > 0 && (
                <TimelineView videoRef={videoRef} scenes={project.scenes} duration={videoDuration} onSplit={handleSplit} onMerge={handleMerge} onSegmentClick={handleSegmentClick} />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2 space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Scenes</CardTitle>
                        {project.status === 'analyzed' && (
                            <Button onClick={handleGenerateThumbnails} disabled={isGeneratingThumbs}>
                                {isGeneratingThumbs ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ImageIcon className="mr-2 h-4 w-4"/>}
                                Generate Thumbnails
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {project.status === 'analyzing' && (
                        <div className="flex flex-col items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                            <p className="mt-4 text-muted-foreground">Analyzing video...</p>
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
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        {project.scenes.map(scene => (
                            <div key={scene.id} className="flex items-center space-x-2">
                                <Checkbox id={`scene-${scene.id}`} onCheckedChange={(checked) => {
                                    setSelectedScenes(prev => {
                                        const newSelection = new Set(prev);
                                        if (checked) newSelection.add(scene.id);
                                        else newSelection.delete(scene.id);
                                        return newSelection;
                                    });
                                }}/>
                                <div className="flex-grow">
                                    <SceneCard scene={scene} onUpdate={handleSceneUpdate} onPreview={handlePreview} videoRef={videoRef} />
                                </div>
                            </div>
                        ))}
                    </div>
                    {project.scenes.length > 0 && (
                        <Button className="w-full mt-4" onClick={handleDownload} disabled={isDownloading || selectedScenes.size === 0}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2"/>}
                            Download Selected ({selectedScenes.size})
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
