import { YouTubeWrapper } from './youtube-wrapper';
import { RetryManager } from './retry-manager';
import { ErrorHandler, EnhancedError } from './error-handler';
import { ConfigUtils, YOUTUBE_DOWNLOADER_CONFIG } from './config';
import { debugLogger } from './debug-logger';
import type { VideoInfo, DownloadOptions, DownloadProgress } from './types';

/**
 * Opciones para el descargador robusto
 */
export interface RobustDownloadOptions extends DownloadOptions {
  enableRetries?: boolean;
  customRetryOptions?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
}

/**
 * Estadísticas de descarga robusta
 */
export interface DownloadStats {
  totalAttempts: number;
  successfulAttempt: number;
  totalTime: number;
  strategiesUsed: string[];
  errorsEncountered: string[];
}

/**
 * Descargador robusto usando solo pytube con reintentos
 */
export class RobustDownloader {
  /**
   * Extrae información de video con reintentos
   */
  static async getVideoInfoRobust(
    url: string,
    options: RobustDownloadOptions = {}
  ): Promise<{ videoInfo: VideoInfo; stats: DownloadStats }> {
    const startTime = Date.now();
    const stats: DownloadStats = {
      totalAttempts: 0,
      successfulAttempt: 0,
      totalTime: 0,
      strategiesUsed: ['pytube'],
      errorsEncountered: []
    };

    console.log('🛡️ Starting robust video info extraction with pytube...');

    const maxRetries = options.customRetryOptions?.maxRetries || YOUTUBE_DOWNLOADER_CONFIG.MAX_RETRIES;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      stats.totalAttempts = attempt;
      
      try {
        console.log(`📡 Attempt ${attempt}/${maxRetries} - Getting video info...`);
        
        const videoInfo = await YouTubeWrapper.getVideoInfo(url);
        
        stats.successfulAttempt = attempt;
        stats.totalTime = Date.now() - startTime;
        
        console.log(`✅ Video info extracted successfully on attempt ${attempt}`);
        return { videoInfo, stats };
        
      } catch (error) {
        const enhancedError = ErrorHandler.createEnhancedError(error as Error, {
          url,
          operation: 'getVideoInfo',
          timestamp: Date.now()
        });
        
        stats.errorsEncountered.push(enhancedError.getSummary());
        
        console.log(`❌ Attempt ${attempt} failed: ${enhancedError.message}`);
        
        if (attempt === maxRetries || !enhancedError.isRetryable()) {
          stats.totalTime = Date.now() - startTime;
          throw enhancedError;
        }
        
        // Wait before retry
        const delay = ConfigUtils.getRetryDelay(attempt);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Descarga video con reintentos
   */
  static async downloadVideoRobust(
    url: string,
    outputPath: string,
    options: RobustDownloadOptions = {},
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<{ filePath: string; stats: DownloadStats }> {
    const startTime = Date.now();
    const stats: DownloadStats = {
      totalAttempts: 0,
      successfulAttempt: 0,
      totalTime: 0,
      strategiesUsed: ['pytube'],
      errorsEncountered: []
    };

    console.log('🛡️ Starting robust video download with pytube...');

    const maxRetries = options.customRetryOptions?.maxRetries || YOUTUBE_DOWNLOADER_CONFIG.MAX_RETRIES;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      stats.totalAttempts = attempt;
      
      try {
        console.log(`📥 Attempt ${attempt}/${maxRetries} - Downloading video...`);
        
        const filePath = await YouTubeWrapper.downloadVideo(
          url,
          outputPath,
          options,
          onProgress
        );
        
        stats.successfulAttempt = attempt;
        stats.totalTime = Date.now() - startTime;
        
        console.log(`✅ Video downloaded successfully on attempt ${attempt}`);
        return { filePath, stats };
        
      } catch (error) {
        const enhancedError = ErrorHandler.createEnhancedError(error as Error, {
          url,
          operation: 'downloadVideo',
          timestamp: Date.now()
        });
        
        stats.errorsEncountered.push(enhancedError.getSummary());
        
        console.log(`❌ Attempt ${attempt} failed: ${enhancedError.message}`);
        
        if (attempt === maxRetries || !enhancedError.isRetryable()) {
          stats.totalTime = Date.now() - startTime;
          throw enhancedError;
        }
        
        // Wait before retry
        const delay = ConfigUtils.getRetryDelay(attempt);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}