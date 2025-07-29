import { NextRequest, NextResponse } from 'next/server';
import { createProjectLocal } from '@/lib/local-actions';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const projectName = formData.get('projectName') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }
    
    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }
    
    // Convertir archivo a buffer
    const arrayBuffer = await file.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);
    
    // Crear proyecto
    const result = await createProjectLocal({
      projectName,
      videoBuffer,
      originalFileName: file.name
    });
    
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      projectId: result.projectId 
    });
    
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}