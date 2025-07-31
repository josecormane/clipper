"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Youtube } from 'lucide-react';
import { LocalFileUploader } from './local-file-uploader';
import { YouTubeDownloader } from './youtube-downloader';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface LocalContentUploaderProps {
  onProjectCreated?: (projectId: string) => void;
}

export function LocalContentUploader({ onProjectCreated }: LocalContentUploaderProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
  const router = useRouter();
  const { toast } = useToast();

  const handleProjectCreated = (projectId: string) => {
    // Notificar al componente padre
    onProjectCreated?.(projectId);

    // Mostrar toast de éxito
    toast({
      title: "Project Created",
      description: "Your video has been added to your library successfully",
    });

    // Navegar al proyecto después de un breve delay
    setTimeout(() => {
      router.push(`/local-project/${projectId}`);
    }, 1500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add Video to Library</CardTitle>
          <CardDescription>
            Upload a video file from your device or download from YouTube
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'youtube')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="youtube" className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                Download from YouTube
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="mt-6">
              <LocalFileUploader />
            </TabsContent>
            
            <TabsContent value="youtube" className="mt-6">
              <YouTubeDownloader onProjectCreated={handleProjectCreated} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}