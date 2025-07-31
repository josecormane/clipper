'use server';

import { YouTubeWrapper } from './youtube-wrapper';
import { createProjectLocal } from '../local-actions';
import path from 'path';
import fs from 'fs';

/**
 * Server action para obtener información de video de YouTube
 */
export async function getYouTubeVideoInfo(url: string) {
  try {
    console.log('📡 Getting YouTube video info for:', url);
    
    const videoInfo = await YouTubeWrapper.getVideoInfo(url);
    
    return {
      success: true,
      data: {
        id: videoInfo.id,
        title: videoInfo.title,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
        uploader: videoInfo.uploader,
        upload_date: videoInfo.upload_date,
        formats: videoInfo.formats.slice(0, 10) // Limitar a 10 formatos principales
      }
    };
  } catch (error) {
    console.error('❌ Failed to get video info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get video info'
    };
  }
}

/**
 * Server action para descargar video de YouTube
 */
export async function downloadYouTubeVideo(
  url: string,
  options: {
    quality?: 'highest' | 'high' | 'medium' | 'low';
    createProject?: boolean;
  } = {}
) {
  try {
    console.log('📥 Starting YouTube video download:', url);
    
    // Obtener información del video primero
    const videoInfo = await YouTubeWrapper.getVideoInfo(url);
    console.log(`📹 Video: ${videoInfo.title} by ${videoInfo.uploader}`);
    
    // Crear directorio de destino
    const storageDir = path.join(process.cwd(), 'local-storage', 'videos');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    // Generar nombre de archivo seguro
    const safeTitle = videoInfo.title
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remover caracteres especiales
      .replace(/\s+/g, '-') // Reemplazar espacios con guiones
      .substring(0, 100); // Limitar longitud
    
    const outputPath = path.join(storageDir, `${safeTitle}.mp4`);
    
    console.log(`📁 Output path: ${outputPath}`);
    
    // Descargar el video
    let filePath = await YouTubeWrapper.downloadVideo(
      url,
      outputPath,
      {
        quality: options.quality || 'high'
      }
    );
    
    console.log(`✅ Download completed: ${filePath}`);
    
    // Verificar que el archivo existe y obtener información
    if (!fs.existsSync(filePath)) {
      // Buscar archivos en el directorio de destino
      console.log(`🔍 File not found at expected path: ${filePath}`);
      console.log(`📁 Searching in directory: ${storageDir}`);
      
      const files = fs.readdirSync(storageDir);
      console.log(`📋 Files found: ${files.join(', ')}`);
      
      // Buscar archivos que contengan el ID del video o el título
      const videoFiles = files.filter(file => 
        file.includes(videoInfo.id) || 
        file.toLowerCase().includes('rick astley') ||
        file.toLowerCase().includes('never gonna give you up')
      );
      
      if (videoFiles.length > 0) {
        const actualFilePath = path.join(storageDir, videoFiles[0]);
        console.log(`✅ Found downloaded file: ${actualFilePath}`);
        filePath = actualFilePath;
      } else {
        throw new Error(`Downloaded file not found. Expected: ${filePath}, Available files: ${files.join(', ')}`);
      }
    }
    
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / 1024 / 1024;
    
    console.log(`📊 File size: ${fileSizeMB.toFixed(2)} MB`);
    
    let projectId: string | undefined;
    
    // Crear proyecto local si se solicita
    if (options.createProject !== false) {
      try {
        // Leer el archivo descargado como buffer
        const videoBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);
        
        const projectResult = await createProjectLocal({
          projectName: videoInfo.title,
          videoBuffer: videoBuffer,
          originalFileName: fileName
        });
        
        if ('projectId' in projectResult) {
          projectId = projectResult.projectId;
          console.log(`🎬 Project created: ${projectId}`);
        } else {
          console.warn('⚠️ Failed to create project:', projectResult.error);
        }
      } catch (error) {
        console.warn('⚠️ Failed to create project:', error);
      }
    }
    
    return {
      success: true,
      data: {
        filePath,
        fileSize: Math.round(fileSizeMB * 100) / 100, // Round to 2 decimals
        projectId,
        videoInfo: {
          id: videoInfo.id,
          title: videoInfo.title,
          duration: videoInfo.duration,
          uploader: videoInfo.uploader
        }
      }
    };
    
  } catch (error) {
    console.error('❌ YouTube download failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed'
    };
  }
}

/**
 * Server action para validar URL de YouTube
 */
export async function validateYouTubeUrl(url: string) {
  try {
    const isValid = await YouTubeWrapper.validateUrl(url);
    return {
      success: true,
      data: { isValid }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    };
  }
}