"use client";

import { Logo } from '@/components/logo';
import { FileUploader } from '@/components/file-uploader';
import { ProjectList } from '@/components/project-list';
import { ApiConfig } from '@/components/api-config';
import { Button } from '@/components/ui/button';
import { Settings, Database } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container mx-auto p-8">
      <header className="flex justify-between items-center mb-12">
        <Logo />
        <div className="flex items-center gap-3">
          <ApiConfig />
          <Link href="/local">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Local Mode
            </Button>
          </Link>
          {process.env.NODE_ENV === 'development' && (
            <>
              <Link href="/debug-times">
                <Button variant="ghost" size="sm" className="text-xs">
                  Debug Times
                </Button>
              </Link>
              <Link href="/debug-analysis">
                <Button variant="ghost" size="sm" className="text-xs">
                  Debug Analysis
                </Button>
              </Link>
              <Link href="/test-gemini-times">
                <Button variant="ghost" size="sm" className="text-xs">
                  Test Times
                </Button>
              </Link>
            </>
          )}
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <div className="mb-8">
            <h1 className="text-2xl font-bold mb-4">Create a New Project</h1>
            <FileUploader />
        </div>
        <div>
            <h1 className="text-2xl font-bold mb-4">Your Projects</h1>
            <ProjectList />
        </div>
      </main>
    </div>
  );
}
