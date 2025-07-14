"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getUploadUrl, createProject, getProjects } from '@/lib/actions';
import { Upload, Film, Loader2 } from 'lucide-react';

type Project = {
  id: string;
  name: string;
  createdAt: string;
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      const { projects, error } = await getProjects();
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Failed to load projects',
          description: error,
        });
      } else if (projects) {
        setProjects(projects as Project[]);
      }
      setIsLoading(false);
    }
    fetchProjects();
  }, [toast]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
        const urlResult = await getUploadUrl({
            fileName: file.name,
            contentType: file.type,
        });

        if (!urlResult.uploadUrl || !urlResult.gcsPath) throw new Error("Failed to get upload URL.");

        await fetch(urlResult.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        });

        const createResult = await createProject({
            projectName: file.name.replace(/\.[^/.]+$/, ""),
            gcsPath: urlResult.gcsPath,
        });

        if (!createResult.projectId) throw new Error("Failed to create project in database.");

        router.push(`/project/${createResult.projectId}`);

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: error.message,
        });
    } finally {
        setIsUploading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-8">
      <header className="flex justify-between items-center mb-12">
        <Logo />
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {isUploading ? 'Uploading...' : 'New Project'}
        </Button>
        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="video/*"
        />
      </header>

      <main>
        <h1 className="text-4xl font-bold mb-8">Your Projects</h1>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">No Projects Yet</h2>
            <p className="text-muted-foreground mt-2">
              Click "New Project" to upload your first video.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/project/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Film className="text-primary" />
                    <span className="truncate">{project.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Created on:{' '}
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
