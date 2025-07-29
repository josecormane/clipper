import { NextRequest, NextResponse } from 'next/server';
import { analyzeProjectLocal } from '@/lib/local-actions';

export async function POST(request: NextRequest) {
  try {
    const { projectId, apiKey } = await request.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }
    
    const result = await analyzeProjectLocal({ projectId, apiKey });
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error in analyze-local endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to analyze project' },
      { status: 500 }
    );
  }
}