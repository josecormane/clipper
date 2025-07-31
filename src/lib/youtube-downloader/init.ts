import fs from 'fs';
import { YouTubeWrapper } from './youtube-wrapper';
import { YOUTUBE_DOWNLOADER_CONFIG } from './config';

/**
 * Inicializa el sistema de descarga de YouTube
 * Verifica dependencias y crea directorios necesarios
 */
export class YouTubeDownloaderInit {
  /**
   * Inicializa todos los componentes necesarios
   */
  static async initialize(): Promise<void> {
    console.log('🚀 Initializing YouTube Downloader system...');
    
    try {
      // Crear directorios necesarios
      await YouTubeDownloaderInit.createDirectories();
      
      // Verificar que yt-dlp esté disponible
      await this.verifyYtDlpInstallation();
      
      // Verificar la instalación
      await YouTubeDownloaderInit.verifyInstallation();
      
      console.log('✅ YouTube Downloader system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize YouTube Downloader system:', error);
      throw error;
    }
  }

  /**
   * Crea los directorios necesarios para el sistema
   */
  private static async createDirectories(): Promise<void> {
    const directories = [
      YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR,
      YOUTUBE_DOWNLOADER_CONFIG.STORAGE_DIR
    ];

    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  /**
   * Verifica que yt-dlp esté instalado y funcional
   */
  private static async verifyYtDlpInstallation(): Promise<void> {
    try {
      // Try to run yt-dlp --version
      const { spawn } = require('child_process');
      const version = await new Promise<string>((resolve, reject) => {
        const process = spawn('yt-dlp', ['--version'], { stdio: 'pipe' });
        let output = '';
        let errorOutput = '';
        
        process.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        process.stderr.on('data', (data: Buffer) => {
          errorOutput += data.toString();
        });
        
        process.on('close', (code: number) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
          }
        });
        
        process.on('error', (error: Error) => {
          reject(new Error(`yt-dlp not found: ${error.message}`));
        });
      });
      
      console.log(`📦 yt-dlp version: ${version}`);
    } catch (error) {
      console.error('❌ yt-dlp verification failed:', error);
      throw new Error('yt-dlp is not installed. Please install it with: pip3 install yt-dlp');
    }
  }

  /**
   * Verifica que la instalación esté completa y funcional
   */
  private static async verifyInstallation(): Promise<void> {
    try {
      // Verificar que yt-dlp esté disponible
      await this.verifyYtDlpInstallation();

      // Verificar que los directorios existan
      const directories = [
        YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR,
        YOUTUBE_DOWNLOADER_CONFIG.STORAGE_DIR
      ];

      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          throw new Error(`Required directory does not exist: ${dir}`);
        }
      }

      console.log('🔍 All system components verified successfully');
    } catch (error) {
      console.error('❌ System verification failed:', error);
      throw error;
    }
  }

  /**
   * Limpia archivos temporales antiguos
   */
  static async cleanup(): Promise<void> {
    try {
      const tempDir = YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR;
      
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas

        for (const file of files) {
          const filePath = `${tempDir}/${file}`;
          const stats = fs.statSync(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Cleaned up old temp file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error);
    }
  }

  /**
   * Obtiene información del estado del sistema
   */
  static async getSystemInfo(): Promise<{
    ytDlpInstalled: boolean;
    ytDlpVersion?: string;
    tempDirExists: boolean;
    storageDirExists: boolean;
    tempDirSize: number;
    storageDirSize: number;
  }> {
    let ytDlpInstalled = false;
    let ytDlpVersion: string | undefined;
    
    try {
      // Try to get yt-dlp version
      const { spawn } = require('child_process');
      ytDlpVersion = await new Promise((resolve, reject) => {
        const process = spawn('yt-dlp', ['--version'], { stdio: 'pipe' });
        let output = '';
        
        process.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        process.on('close', (code: number) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            reject(new Error('yt-dlp not found'));
          }
        });
        
        process.on('error', () => {
          reject(new Error('yt-dlp not found'));
        });
      });
      
      ytDlpInstalled = true;
    } catch {
      ytDlpInstalled = false;
      ytDlpVersion = undefined;
    }

    const tempDirExists = fs.existsSync(YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR);
    const storageDirExists = fs.existsSync(YOUTUBE_DOWNLOADER_CONFIG.STORAGE_DIR);

    // Calcular tamaños de directorio
    const tempDirSize = tempDirExists ? YouTubeDownloaderInit.getDirectorySize(YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR) : 0;
    const storageDirSize = storageDirExists ? YouTubeDownloaderInit.getDirectorySize(YOUTUBE_DOWNLOADER_CONFIG.STORAGE_DIR) : 0;

    return {
      ytDlpInstalled,
      ytDlpVersion,
      tempDirExists,
      storageDirExists,
      tempDirSize,
      storageDirSize
    };
  }

  /**
   * Calcula el tamaño de un directorio recursivamente
   */
  private static getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = `${dirPath}/${file}`;
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += YouTubeDownloaderInit.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not calculate size for ${dirPath}:`, error);
    }
    
    return totalSize;
  }
}