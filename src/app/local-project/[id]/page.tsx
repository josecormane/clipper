"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getProjectLocal, 
  updateProjectLocal, 
  deleteProjectLocal, 
  clipVideoLocal, 
  analyzeProjectLocal,
  regenerateAllThumbnailsLocal,
  generateMissingThumbnailsLocal,
  resetScenesLocal
} from '@/lib/local-actions';
import { useToast } from '@/hooks/use-toast';
import { useApiConfig } from '@/hooks/use-api-config';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { SceneCard } from '@/components/scene-card';
import { TimelineView } from '@/components/timeline-view';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ApiKeyRequired } from '@/components/api-key-required';
import { Loader2, Trash2, Download, Wand2, AlertTriangle, RefreshCw, Database, CheckSquare, Square, Image, Settings, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveAs } from 'file-saver';
import { timeStringToSeconds, secondsToTimeString } from '@/lib/utils';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { ReprocessConfirmationModal } from '@/components/reprocess-confirmation-modal';
import { AnalysisProgress } from '@/components/analysis-progress';
import { ProjectStats } from '@/components/project-stats';
import JSZip from 'jszip';

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
  originalScenes?: Scene[];
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
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [isRegeneratingThumbnails, setIsRegeneratingThumbnails] = useState(false);
  const [scenePadding, setScenePadding] = useState(0.0);
  const [isApplyingPadding, setIsApplyingPadding] = useState(false);
  const [isResettingScenes, setIsResettingScenes] = useState(false);
  
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
        
        // Generar thumbnails faltantes automáticamente si el proyecto está analizado
        if ((data as Project).status === 'analyzed' && (data as Project).scenes.length > 0) {
          console.log('🔍 Checking for missing thumbnails...');
          
          // Ejecutar en background sin bloquear la UI
          generateMissingThumbnailsLocal({ projectId })
            .then(({ success, generated, error }) => {
              if (success && generated && generated > 0) {
                console.log(`✅ Generated ${generated} missing thumbnails`);
                // Refrescar los datos del proyecto para mostrar los nuevos thumbnails
                setTimeout(async () => {
                  const { project: updatedData } = await getProjectLocal({ projectId });
                  if (updatedData) {
                    setProject(updatedData as Project);
                  }
                }, 1000);
              } else if (error) {
                console.error('❌ Error generating missing thumbnails:', error);
              }
            })
            .catch(err => {
              console.error('❌ Unexpected error generating thumbnails:', err);
            });
        }
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
  
  const handleSceneSelection = (sceneId: number) => {
    setSelectedScenes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedScenes.size === project?.scenes.length) {
      setSelectedScenes(new Set());
    } else {
      setSelectedScenes(new Set(project?.scenes.map(s => s.id) || []));
    }
  };

  const handleDownloadSelected = async () => {
    if (!project || selectedScenes.size === 0) return;
    
    const scenesToDownload = project.scenes.filter(scene => selectedScenes.has(scene.id));
    
    if (scenesToDownload.length === 1) {
      // Descarga individual
      await downloadSingleScene(scenesToDownload[0]);
    } else {
      // Descarga múltiple en ZIP
      await downloadScenesAsZip(scenesToDownload);
    }
  };

  const downloadSingleScene = async (scene: Scene) => {
    setIsDownloading(true);
    
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
    } else {
      saveAs(clipResult.clipDataUri!, `${project.name}-scene-${scene.id}.mp4`);
    }
    
    setIsDownloading(false);
  };

  const downloadScenesAsZip = async (scenes: Scene[]) => {
    setIsDownloading(true);
    const zip = new JSZip();
    
    toast({ 
      title: "Preparing Download", 
      description: `Processing ${scenes.length} scenes...` 
    });

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      
      toast({ 
        title: "Processing", 
        description: `Scene ${i + 1} of ${scenes.length}...` 
      });
      
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
      
      // Convertir data URI a blob
      const response = await fetch(clipResult.clipDataUri!);
      const blob = await response.blob();
      
      zip.file(`scene-${scene.id}-${scene.description.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.mp4`, blob);
    }
    
    // Generar y descargar ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${project.name}-scenes.zip`);
    
    toast({ 
      title: "Download Complete", 
      description: `${scenes.length} scenes downloaded successfully!` 
    });
    
    setIsDownloading(false);
    setSelectedScenes(new Set());
    setSelectionMode(false);
  };

  const handleDownloadAll = async () => {
    if (!project) return;
    
    // Seleccionar todas las escenas y descargar
    const allSceneIds = new Set(project.scenes.map(s => s.id));
    setSelectedScenes(allSceneIds);
    
    if (project.scenes.length === 1) {
      await downloadSingleScene(project.scenes[0]);
    } else {
      await downloadScenesAsZip(project.scenes);
    }
    
    setSelectedScenes(new Set());
  };

  const handleRegenerateThumbnails = async () => {
    if (!project) return;
    
    setIsRegeneratingThumbnails(true);
    toast({ 
      title: "Regenerating Thumbnails", 
      description: "This may take a few moments..." 
    });
    
    const { error, updatedScenes } = await regenerateAllThumbnailsLocal({ projectId });
    
    if (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Failed to regenerate thumbnails', 
        description: error 
      });
    } else {
      toast({ 
        title: "Thumbnails Regenerated", 
        description: "All thumbnails have been updated successfully!" 
      });
      // Refrescar los datos del proyecto
      await fetchProjectData();
    }
    
    setIsRegeneratingThumbnails(false);
  };

  const applyPaddingToScenes = (scenes: Scene[], padding: number, videoDuration: number): Scene[] => {
    return scenes.map((scene, index) => {
      const startSeconds = timeStringToSeconds(scene.startTime);
      const endSeconds = timeStringToSeconds(scene.endTime);
      
      // Aplicar padding
      let newStartSeconds = Math.max(0, startSeconds + padding);
      let newEndSeconds = Math.min(videoDuration, endSeconds - padding);
      
      // Asegurar que la escena tenga al menos 0.1 segundos de duración
      if (newEndSeconds - newStartSeconds < 0.1) {
        const center = (startSeconds + endSeconds) / 2;
        newStartSeconds = Math.max(0, center - 0.05);
        newEndSeconds = Math.min(videoDuration, center + 0.05);
      }
      
      return {
        ...scene,
        startTime: secondsToTimeString(newStartSeconds),
        endTime: secondsToTimeString(newEndSeconds)
      };
    });
  };

  const handleApplyPadding = async () => {
    if (!project || scenePadding === 0) return;
    
    setIsApplyingPadding(true);
    toast({ 
      title: "Applying Padding", 
      description: `Adjusting scenes with ${scenePadding}s padding...` 
    });
    
    try {
      const adjustedScenes = applyPaddingToScenes(project.scenes, scenePadding, videoDuration);
      
      const { error } = await updateProjectLocal({ 
        projectId, 
        scenes: adjustedScenes 
      });
      
      if (error) {
        toast({ 
          variant: 'destructive', 
          title: 'Failed to apply padding', 
          description: error 
        });
      } else {
        toast({ 
          title: "Padding Applied", 
          description: `All scenes adjusted with ${scenePadding}s padding!` 
        });
        // Refrescar los datos del proyecto
        await fetchProjectData();
      }
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error applying padding', 
        description: 'An unexpected error occurred' 
      });
    }
    
    setIsApplyingPadding(false);
  };

  const handleResetScenes = async () => {
    if (!project) return;
    
    const confirmed = confirm(
      'Are you sure you want to reset all scenes to their original Gemini version? This will undo all manual adjustments and padding changes.'
    );
    
    if (!confirmed) return;
    
    setIsResettingScenes(true);
    toast({ 
      title: "Resetting Scenes", 
      description: "Restoring original Gemini scene cuts..." 
    });
    
    try {
      const { error, resetScenes } = await resetScenesLocal({ projectId });
      
      if (error) {
        toast({ 
          variant: 'destructive', 
          title: 'Failed to reset scenes', 
          description: error 
        });
      } else {
        toast({ 
          title: "Scenes Reset", 
          description: `All scenes restored to original Gemini version!` 
        });
        // Refrescar los datos del proyecto
        await fetchProjectData();
        // Resetear el padding a 0
        setScenePadding(0);
      }
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error resetting scenes', 
        description: 'An unexpected error occurred' 
      });
    }
    
    setIsResettingScenes(false);
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
        <div className="w-full max-w-7xl mx-auto">
          {/* Header con título y controles */}
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
                  <>
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
                   
                   <Button 
                     variant="outline" 
                     onClick={handleRegenerateThumbnails}
                     disabled={isRegeneratingThumbnails || isReprocessing}
                   >
                      {isRegeneratingThumbnails ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                      ) : (
                        <Image className="mr-2 h-4 w-4"/>
                      )}
                      Fix Thumbnails
                   </Button>
                  </>
                )}
                
                {project.scenes.length > 0 && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSelectionMode(!selectionMode);
                        setSelectedScenes(new Set());
                      }}
                      disabled={isDownloading || isReprocessing}
                    >
                      {selectionMode ? 'Cancel Selection' : 'Select Scenes'}
                    </Button>
                    
                    {selectionMode && (
                      <>
                        <Button 
                          variant="outline"
                          onClick={handleSelectAll}
                          disabled={isDownloading}
                        >
                          {selectedScenes.size === project.scenes.length ? (
                            <>
                              <Square className="mr-2 h-4 w-4"/>
                              Deselect All
                            </>
                          ) : (
                            <>
                              <CheckSquare className="mr-2 h-4 w-4"/>
                              Select All
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          onClick={handleDownloadSelected}
                          disabled={isDownloading || selectedScenes.size === 0}
                        >
                          {isDownloading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                          ) : (
                            <Download className="mr-2"/>
                          )}
                          Download Selected ({selectedScenes.size})
                        </Button>
                      </>
                    )}
                    
                    {!selectionMode && (
                      <Button 
                        onClick={handleDownloadAll} 
                        disabled={isDownloading || isReprocessing}
                      >
                        {isDownloading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        ) : (
                          <Download className="mr-2"/>
                        )}
                        Download All Scenes
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Layout principal: Video (70%) + Estadísticas (30%) */}
          <div className="grid grid-cols-10 gap-6 mb-6">
            {/* Video Player - 70% */}
            <div className="col-span-7">
              <video 
                ref={videoRef} 
                controls 
                src={project.originalVideoUrl} 
                className="w-full rounded-lg aspect-video mb-4" 
                crossOrigin="anonymous" 
                onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)} 
              />
              
              {showTimeline && (
                <TimelineView 
                  videoRef={videoRef} 
                  scenes={project.scenes} 
                  duration={videoDuration} 
                  onSplit={handleSplit} 
                  onMerge={handleMerge} 
                  onSegmentClick={handleSegmentClick}
                  onScenesUpdate={async (updatedScenes) => {
                    // Actualizar múltiples escenas de una vez para mantener consistencia
                    if (!project) return;
                    
                    console.log(`📝 Timeline updating ${updatedScenes.length} scenes:`, updatedScenes.map(s => `${s.id}: ${s.startTime} → ${s.endTime}`));
                    
                    let newScenes = [...project.scenes];
                    const scenesToRegenerateThumbnails: any[] = [];
                    
                    updatedScenes.forEach(updatedScene => {
                      const index = newScenes.findIndex(s => s.id === updatedScene.id);
                      if (index !== -1) {
                        const originalScene = newScenes[index];
                        // Si cambió el tiempo de inicio, necesitamos regenerar el thumbnail
                        if (originalScene.startTime !== updatedScene.startTime) {
                          scenesToRegenerateThumbnails.push({ ...originalScene, ...updatedScene });
                        }
                        newScenes[index] = { ...newScenes[index], ...updatedScene };
                      }
                    });
                    
                    // Actualizar todas las escenas de una vez
                    autosave(newScenes);
                    
                    // Regenerar thumbnails para escenas que cambiaron su tiempo de inicio
                    if (scenesToRegenerateThumbnails.length > 0) {
                      // Regenerar thumbnails en paralelo
                      const thumbnailPromises = scenesToRegenerateThumbnails.map(async (scene) => {
                        try {
                          const { generateThumbnailLocal } = await import('@/lib/local-actions');
                          const { thumbnail } = await generateThumbnailLocal({ 
                            videoPath: project.originalVideoPath, 
                            scene: scene 
                          });
                          
                          if (thumbnail) {
                            return { sceneId: scene.id, thumbnail };
                          }
                        } catch (error) {
                          console.error(`Failed to regenerate thumbnail for scene ${scene.id}:`, error);
                        }
                        return null;
                      });
                      
                      // Esperar a que se generen todos los thumbnails
                      const thumbnailResults = await Promise.all(thumbnailPromises);
                      
                      // Actualizar las escenas con los nuevos thumbnails
                      const scenesWithNewThumbnails = [...newScenes];
                      let hasUpdates = false;
                      
                      thumbnailResults.forEach(result => {
                        if (result) {
                          const sceneIndex = scenesWithNewThumbnails.findIndex(s => s.id === result.sceneId);
                          if (sceneIndex !== -1) {
                            scenesWithNewThumbnails[sceneIndex] = {
                              ...scenesWithNewThumbnails[sceneIndex],
                              thumbnail: result.thumbnail
                            };
                            hasUpdates = true;
                          }
                        }
                      });
                      
                      // Si hay thumbnails nuevos, guardar otra vez
                      if (hasUpdates) {
                        autosave(scenesWithNewThumbnails);
                      }
                    }
                  }}
                  onTimeUpdate={() => {}} // No necesitamos hacer nada especial aquí
                  onDragStart={() => {}} // No necesitamos hacer nada especial aquí
                  onDragEnd={() => {}} // No necesitamos hacer nada especial aquí
                />
              )}
            </div>
            
            {/* Project Statistics - 30% */}
            <div className="col-span-3 space-y-4">
              <ProjectStats project={project} />
              
              {/* Scene Padding Controls */}
              {project.status === 'analyzed' && project.scenes.length > 0 && (
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4" />
                    <h3 className="text-sm font-medium">Scene Adjustments</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="padding" className="text-xs text-muted-foreground">
                        Scene Padding (seconds)
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="padding"
                          type="number"
                          step="0.1"
                          min="-5"
                          max="5"
                          value={scenePadding}
                          onChange={(e) => setScenePadding(parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs"
                          placeholder="0.0"
                        />
                        <Button
                          size="sm"
                          onClick={handleApplyPadding}
                          disabled={isApplyingPadding || scenePadding === 0}
                          className="h-8 px-3 text-xs"
                        >
                          {isApplyingPadding ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Apply'
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <p>• Positive values: scenes start/end later/earlier</p>
                      <p>• Negative values: scenes start/end earlier/later</p>
                      <p>• Useful for fine-tuning Gemini's scene cuts</p>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetScenes}
                        disabled={isResettingScenes}
                        className="w-full h-8 text-xs"
                      >
                        {isResettingScenes ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <RotateCcw className="h-3 w-3 mr-1" />
                        )}
                        Reset to Original Gemini Cuts
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

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
                      selectionMode={selectionMode}
                      isSelected={selectedScenes.has(scene.id)}
                      onSelectionChange={handleSceneSelection}
                      onDownload={downloadSingleScene}
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