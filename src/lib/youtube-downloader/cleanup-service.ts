import fs from 'fs';
import path from 'path';
import { YOUTUBE_DOWNLOADER_CONFIG } from './config';

/**
 * Servicio de limpieza automática de archivos temporales
 */
export class CleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
  private static readonly MAX_TEMP_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Inicia el servicio de limpieza automática
   */
  static start(): void {
    if (CleanupService.cleanupInterval) {
      return; // Ya está iniciado
    }

    console.log('🧹 Starting cleanup service...');
    
    // Ejecutar limpieza inicial
    CleanupService.cleanup();

    // Programar limpiezas periódicas
    CleanupService.cleanupInterval = setInterval(() => {
      CleanupService.cleanup();
    }, CleanupService.CLEANUP_INTERVAL_MS);
  }

  /**
   * Detiene el servicio de limpieza automática
   */
  static stop(): void {
    if (CleanupService.cleanupInterval) {
      clearInterval(CleanupService.cleanupInterval);
      CleanupService.cleanupInterval = null;
      console.log('🛑 Cleanup service stopped');
    }
  }

  /**
   * Ejecuta una limpieza manual
   */
  static async cleanup(): Promise<{
    tempFilesRemoved: number;
    tempDirsRemoved: number;
    bytesFreed: number;
  }> {
    console.log('🧹 Running cleanup...');
    
    let tempFilesRemoved = 0;
    let tempDirsRemoved = 0;
    let bytesFreed = 0;

    const tempDir = YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR;
    
    if (!fs.existsSync(tempDir)) {
      return { tempFilesRemoved, tempDirsRemoved, bytesFreed };
    }

    try {
      const entries = fs.readdirSync(tempDir, { withFileTypes: true });
      const now = Date.now();

      for (const entry of entries) {
        const fullPath = path.join(tempDir, entry.name);
        
        try {
          const stats = fs.statSync(fullPath);
          const age = now - stats.mtime.getTime();

          if (age > CleanupService.MAX_TEMP_FILE_AGE_MS) {
            if (entry.isDirectory()) {
              // Limpiar directorio recursivamente
              const dirStats = CleanupService.getDirectoryStats(fullPath);
              fs.rmSync(fullPath, { recursive: true, force: true });
              
              tempDirsRemoved++;
              bytesFreed += dirStats.size;
              
              console.log(`🗑️ Removed temp directory: ${entry.name} (${CleanupService.formatBytes(dirStats.size)})`);
            } else {
              // Limpiar archivo individual
              const fileSize = stats.size;
              fs.unlinkSync(fullPath);
              
              tempFilesRemoved++;
              bytesFreed += fileSize;
              
              console.log(`🗑️ Removed temp file: ${entry.name} (${CleanupService.formatBytes(fileSize)})`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to clean up ${entry.name}:`, error);
        }
      }

      if (tempFilesRemoved > 0 || tempDirsRemoved > 0) {
        console.log(`✅ Cleanup completed: ${tempFilesRemoved} files, ${tempDirsRemoved} directories, ${CleanupService.formatBytes(bytesFreed)} freed`);
      } else {
        console.log('✅ Cleanup completed: No old files found');
      }

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }

    return { tempFilesRemoved, tempDirsRemoved, bytesFreed };
  }

  /**
   * Limpia archivos de una sesión específica
   */
  static cleanupSession(sessionId: string): void {
    const sessionDir = path.join(YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR, sessionId);
    
    if (fs.existsSync(sessionDir)) {
      try {
        const stats = CleanupService.getDirectoryStats(sessionDir);
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`🗑️ Cleaned up session ${sessionId} (${CleanupService.formatBytes(stats.size)})`);
      } catch (error) {
        console.warn(`⚠️ Failed to clean up session ${sessionId}:`, error);
      }
    }
  }

  /**
   * Obtiene estadísticas de un directorio
   */
  private static getDirectoryStats(dirPath: string): { size: number; files: number } {
    let totalSize = 0;
    let totalFiles = 0;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subStats = CleanupService.getDirectoryStats(fullPath);
          totalSize += subStats.size;
          totalFiles += subStats.files;
        } else {
          try {
            const stats = fs.statSync(fullPath);
            totalSize += stats.size;
            totalFiles++;
          } catch (error) {
            console.warn(`⚠️ Failed to get stats for ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to read directory ${dirPath}:`, error);
    }

    return { size: totalSize, files: totalFiles };
  }

  /**
   * Formatea bytes en formato legible
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtiene estadísticas del directorio temporal
   */
  static getTempDirStats(): {
    totalSize: number;
    totalFiles: number;
    totalDirs: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  } {
    const tempDir = YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR;
    
    if (!fs.existsSync(tempDir)) {
      return {
        totalSize: 0,
        totalFiles: 0,
        totalDirs: 0,
        oldestFile: null,
        newestFile: null
      };
    }

    let totalSize = 0;
    let totalFiles = 0;
    let totalDirs = 0;
    let oldestFile: Date | null = null;
    let newestFile: Date | null = null;

    const processDirectory = (dirPath: string) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          try {
            const stats = fs.statSync(fullPath);
            const mtime = stats.mtime;
            
            if (!oldestFile || mtime < oldestFile) {
              oldestFile = mtime;
            }
            if (!newestFile || mtime > newestFile) {
              newestFile = mtime;
            }
            
            if (entry.isDirectory()) {
              totalDirs++;
              processDirectory(fullPath);
            } else {
              totalFiles++;
              totalSize += stats.size;
            }
          } catch (error) {
            console.warn(`⚠️ Failed to process ${fullPath}:`, error);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to read directory ${dirPath}:`, error);
      }
    };

    processDirectory(tempDir);

    return {
      totalSize,
      totalFiles,
      totalDirs,
      oldestFile,
      newestFile
    };
  }

  /**
   * Fuerza la limpieza de todos los archivos temporales (usar con cuidado)
   */
  static forceCleanAll(): Promise<void> {
    return new Promise((resolve, reject) => {
      const tempDir = YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR;
      
      if (!fs.existsSync(tempDir)) {
        resolve();
        return;
      }

      try {
        console.log('🧹 Force cleaning all temp files...');
        fs.rmSync(tempDir, { recursive: true, force: true });
        fs.mkdirSync(tempDir, { recursive: true });
        console.log('✅ All temp files cleaned');
        resolve();
      } catch (error) {
        console.error('❌ Force clean failed:', error);
        reject(error);
      }
    });
  }
}