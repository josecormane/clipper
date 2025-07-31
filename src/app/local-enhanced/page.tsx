"use client";

import { Logo } from '@/components/logo';
import { LocalContentUploader } from '@/components/local-content-uploader';
import { EnhancedLocalProjectList } from '@/components/enhanced-local-project-list';
import { ApiConfig } from '@/components/api-config';
import { Button } from '@/components/ui/button';
import { Settings, Home, Database } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EnhancedLocalPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  const handleProjectCreated = (projectId: string) => {
    // Refresh the project list
    setRefreshKey(prev => prev + 1);
    
    // Navigate to the project after a brief delay
    setTimeout(() => {
      router.push(`/local-project/${projectId}`);
    }, 2000);
  };

  return (
    <div className="container mx-auto p-8">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
            <Database className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Local Mode Enhanced
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <ApiConfig />
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Link href="/local">
            <Button variant="outline" size="sm">
              Original Local
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Cloud Mode
            </Button>
          </Link>
        </div>
      </header>

      <main className="space-y-12">
        {/* Upload Section */}
        <section>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Enhanced Local Video Analysis</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Analyze videos completely locally without cloud dependencies. 
              Upload files from your device or download directly from YouTube.
              Your videos are stored on your machine and only your Gemini API key is used for AI analysis.
            </p>
          </div>
          <LocalContentUploader onProjectCreated={handleProjectCreated} />
        </section>

        {/* Projects Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Your Local Projects</h2>
            <p className="text-muted-foreground">
              Projects stored locally on this machine, including uploaded files and YouTube downloads
            </p>
          </div>
          <div key={refreshKey}>
            <EnhancedLocalProjectList />
          </div>
        </section>
      </main>
    </div>
  );
}