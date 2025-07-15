"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { getUploadUrl, createProject } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export function FileUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get signed URL
      const { uploadUrl, gcsPath } = await getUploadUrl({
        fileName: file.name,
        contentType: file.type,
      });

      // 2. Upload file to GCS
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };
      
      xhr.onload = async () => {
        if (xhr.status === 200) {
          // 3. Create project in Firestore
          const result = await createProject({
            projectName: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
            gcsPath,
          });

          if ('error' in result) {
            toast({ variant: 'destructive', title: 'Failed to create project', description: result.error });
            setIsUploading(false);
            return;
          }
          toast({ title: 'Upload successful!', description: 'Redirecting to your new project...' });
          router.push(`/project/${result.projectId}`);
        } else {
          toast({ variant: 'destructive', title: 'Upload failed', description: 'Could not upload file to storage.' });
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        toast({ variant: 'destructive', title: 'Upload failed', description: 'An error occurred during the upload.' });
        setIsUploading(false);
      };

      xhr.send(file);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: error.message });
      setIsUploading(false);
    }
  }, [router, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: false,
    disabled: isUploading,
  });

  return (
    <Card
      {...getRootProps()}
      className={`border-2 border-dashed ${isDragActive ? 'border-primary' : 'border-border'} hover:border-primary transition-colors cursor-pointer`}
    >
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <input {...getInputProps()} />
        {isUploading ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Uploading...</p>
            <Progress value={uploadProgress} className="w-full mt-2" />
          </>
        ) : (
          <>
            <UploadCloud className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              {isDragActive ? 'Drop the video here ...' : "Drag 'n' drop a video here, or click to select a file"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
