import { NextRequest, NextResponse } from 'next/server';
import { getVideoPath } from '@/lib/local-storage';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const videoPath = getVideoPath(filename);
    
    if (!fs.existsSync(videoPath)) {
      return new NextResponse('Video not found', { status: 404 });
    }
    
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = request.headers.get('range');
    
    if (range) {
      // Soporte para streaming de video (range requests)
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      const file = fs.createReadStream(videoPath, { start, end });
      
      return new NextResponse(file as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'video/mp4',
        },
      });
    } else {
      // Servir archivo completo
      const file = fs.createReadStream(videoPath);
      
      return new NextResponse(file as any, {
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'video/mp4',
        },
      });
    }
  } catch (error) {
    console.error('Error serving video:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}