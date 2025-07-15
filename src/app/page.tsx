"use client";

import { Logo } from '@/components/logo';
import { FileUploader } from '@/components/file-uploader';
import { ProjectList } from '@/components/project-list';

export default function HomePage() {
  return (
    <div className="container mx-auto p-8">
      <header className="flex justify-between items-center mb-12">
        <Logo />
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
