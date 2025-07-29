import { NextRequest, NextResponse } from 'next/server';
import { getProjectLocal } from '@/lib/local-actions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    const { project, error } = await getProjectLocal({ projectId });
    
    if (error || !project) {
      return NextResponse.json(
        { error: error || 'Project not found' },
        { status: 404 }
      );
    }

    // Calculate progress based on project status and scenes
    let progress = 0;
    if (project.status === 'analyzed') {
      progress = 100;
    } else if (project.status === 'analyzing') {
      // Estimate progress based on scenes found so far
      // This is a rough estimate since we don't have real-time chunk progress
      progress = Math.min(project.scenes.length * 5, 90); // Max 90% until complete
    }

    return NextResponse.json({
      status: project.status,
      progress,
      scenesFound: project.scenes.length,
      isAnalyzing: project.status === 'analyzing',
      error: project.status === 'error' ? project.analysisError : null,
      lastModified: project.lastModified,
    });
    
  } catch (error) {
    console.error('Error getting analysis progress:', error);
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}