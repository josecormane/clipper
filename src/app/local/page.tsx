"use client";

import { Logo } from '@/components/logo';
import { LocalFileUploader } from '@/components/local-file-uploader';
import { LocalProjectList } from '@/components/local-project-list';
import { ApiConfig } from '@/components/api-config';
import { Button } from '@/components/ui/button';
import { Settings, Home, Database } from 'lucide-react';
import Link from 'next/link';

export default function LocalHomePage() {
  return (
    <div className="container mx-auto p-8">
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
            <Database className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Local Mode
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
            <h1 className="text-3xl font-bold mb-4">Local Video Analysis</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Analyze videos completely locally without cloud dependencies. 
              Your videos are stored on your machine and only your Gemini API key is used for AI analysis.
            </p>
          </div>
          <LocalFileUploader />
        </section>

        {/* Projects Section */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Your Local Projects</h2>
            <p className="text-muted-foreground">
              Projects stored locally on this machine
            </p>
          </div>
          <LocalProjectList />
        </section>
      </main>
    </div>
  );
}