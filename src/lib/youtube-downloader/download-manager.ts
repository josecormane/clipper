import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { YOUTUBE_DOWNLOADER_CONFIG, YouTubeDownloadError } from './config';
import type { DownloadOptions, DownloadProgress } from './types';
import type { DownloadStatus } from './config';

/**
 * Información de una sesión de descarga
 */
export interface DownloadSession {
  id: string;
  url: string;
  status: DownloadStatus;
  progress: DownloadProgress;
  outputPath?: string;
  finalPath?: string;
  projectId?: string;
  error?: string;
  startTime: number;
  endTime?: number;
  options: DownloadOptions;
  cancelRequested: boolean;
}

/**
 * Gestor de descargas concurrentes con seguimiento de progreso
 */
export class DownloadManager extends EventEmitter {
  private static instance: DownloadManager;
  private activeSessions: Map<string, DownloadSession> = new Map();
  private downloadQueue: string[] = [];
  private maxConcurrentDownloads: number;

  private constructor() {
    super();
    this.maxConcurrentDownloads = YOUTUBE_DOWNLOADER_CONFIG.MAX_CONCURRENT_DOWNLOADS;
    
    // Limpiar sesiones antiguas al inicializar
    this.cleanup();
  }

  /**
   * Obtiene la instancia singleton del DownloadManager
   */
  static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  /**
   * Inicia una nueva descarga
   */
  async startDownload(url: string, options: DownloadOptions = {}): Promise<string> {
    const sessionId = uuidv4();
    const tempDir = path.join(YOUTUBE_DOWNLOADER_CONFIG.TEMP_DIR, sessionId);
    
    // Crear directorio temporal
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const session: DownloadSession = {
      id: sessionId,
      url,
      status: 'pending',
      progress: { status: 'downloading' },
      outputPath: tempDir,
      startTime: Date.now(),
      options,
      cancelRequested: false
    };

    this.activeSessions.set(sessionId, session);
    this.downloadQueue.push(sessionId);

    console.log(`📥 Download session created: ${sessionId}`);
    console.log(`📊 Queue length: ${this.downloadQueue.length}`);
    console.log(`🔄 Active downloads: ${this.getActiveDownloadCount()}`);

    // Emitir evento de sesión creada
    this.emit('sessionCreated', session);

    // Procesar cola de descargas
    this.processQueue();

    return sessionId;
  }

  /**
   * Cancela una descarga
   */
  async cancelDownload(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Download session not found');
    }

    console.log(`❌ Cancelling download: ${sessionId}`);
    
    session.cancelRequested = true;
    session.status = 'cancelled';
    session.endTime = Date.now();

    // Limpiar archivos temporales
    if (session.outputPath && fs.existsSync(session.outputPath)) {
      try {
        fs.rmSync(session.outputPath, { recursive: true, force: true });
        console.log(`🗑️ Cleaned up temp directory: ${session.outputPath}`);
      } catch (error) {
        console.warn(`⚠️ Failed to clean up temp directory: ${error}`);
      }
    }

    // Remover de la cola si está pendiente
    const queueIndex = this.downloadQueue.indexOf(sessionId);
    if (queueIndex !== -1) {
      this.downloadQueue.splice(queueIndex, 1);
    }

    this.emit('sessionCancelled', session);
    this.emit('sessionUpdated', session);

    // Procesar siguiente en cola
    this.processQueue();
  }

  /**
   * Obtiene el estado de una descarga
   */
  getDownloadStatus(sessionId: string): DownloadSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Obtiene todas las sesiones activas
   */
  getAllActiveSessions(): DownloadSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Obtiene sesiones por estado
   */
  getSessionsByStatus(status: DownloadStatus): DownloadSession[] {
    return Array.from(this.activeSessions.values()).filter(session => session.status === status);
  }

  /**
   * Actualiza el progreso de una descarga
   */
  updateProgress(sessionId: string, progress: Partial<DownloadProgress>): void {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.cancelRequested) {
      return;
    }

    session.progress = { ...session.progress, ...progress };
    
    // Actualizar estado basado en el progreso
    if (progress.status) {
      session.status = progress.status === 'complete' ? 'complete' : 
                     progress.status === 'error' ? 'error' : 'downloading';
    }

    this.emit('progressUpdated', session);
    this.emit('sessionUpdated', session);

    // Si la descarga se completó o falló, procesar siguiente en cola
    if (session.status === 'complete' || session.status === 'error') {
      session.endTime = Date.now();
      this.processQueue();
    }
  }

  /**
   * Marca una descarga como completada
   */
  completeDownload(sessionId: string, finalPath: string, projectId?: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'complete';
    session.finalPath = finalPath;
    session.projectId = projectId;
    session.endTime = Date.now();
    session.progress.status = 'complete';

    console.log(`✅ Download completed: ${sessionId}`);
    console.log(`📁 Final path: ${finalPath}`);
    if (projectId) {
      console.log(`🎬 Project created: ${projectId}`);
    }

    this.emit('sessionCompleted', session);
    this.emit('sessionUpdated', session);

    // Limpiar directorio temporal
    if (session.outputPath && fs.existsSync(session.outputPath)) {
      try {
        fs.rmSync(session.outputPath, { recursive: true, force: true });
      } catch (error) {
        console.warn(`⚠️ Failed to clean up temp directory: ${error}`);
      }
    }

    this.processQueue();
  }

  /**
   * Marca una descarga como fallida
   */
  failDownload(sessionId: string, error: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'error';
    session.error = error;
    session.endTime = Date.now();
    session.progress.status = 'error';

    console.log(`❌ Download failed: ${sessionId}`);
    console.log(`💥 Error: ${error}`);

    this.emit('sessionFailed', session);
    this.emit('sessionUpdated', session);

    // Limpiar directorio temporal
    if (session.outputPath && fs.existsSync(session.outputPath)) {
      try {
        fs.rmSync(session.outputPath, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to clean up temp directory: ${cleanupError}`);
      }
    }

    this.processQueue();
  }

  /**
   * Procesa la cola de descargas
   */
  private processQueue(): void {
    const activeCount = this.getActiveDownloadCount();
    const availableSlots = this.maxConcurrentDownloads - activeCount;

    if (availableSlots <= 0 || this.downloadQueue.length === 0) {
      return;
    }

    // Procesar tantas descargas como slots disponibles
    for (let i = 0; i < Math.min(availableSlots, this.downloadQueue.length); i++) {
      const sessionId = this.downloadQueue.shift();
      if (sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session && !session.cancelRequested) {
          this.startDownloadExecution(session);
        }
      }
    }
  }

  /**
   * Inicia la ejecución real de una descarga
   */
  private async startDownloadExecution(session: DownloadSession): Promise<void> {
    session.status = 'downloading';
    this.emit('sessionStarted', session);
    this.emit('sessionUpdated', session);

    console.log(`🚀 Starting download execution: ${session.id}`);
    console.log(`🔗 URL: ${session.url}`);
  }

  /**
   * Obtiene el número de descargas activas (downloading)
   */
  private getActiveDownloadCount(): number {
    return Array.from(this.activeSessions.values())
      .filter(session => session.status === 'downloading').length;
  }

  /**
   * Limpia sesiones completadas o fallidas antiguas
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.endTime && (now - session.endTime > maxAge)) {
        console.log(`🗑️ Cleaning up old session: ${sessionId}`);
        
        // Limpiar directorio temporal si existe
        if (session.outputPath && fs.existsSync(session.outputPath)) {
          try {
            fs.rmSync(session.outputPath, { recursive: true, force: true });
          } catch (error) {
            console.warn(`⚠️ Failed to clean up temp directory: ${error}`);
          }
        }
        
        this.activeSessions.delete(sessionId);
      }
    }
  }

  /**
   * Obtiene estadísticas del gestor de descargas
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    queuedSessions: number;
    completedSessions: number;
    failedSessions: number;
    cancelledSessions: number;
  } {
    const sessions = Array.from(this.activeSessions.values());
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'downloading').length,
      queuedSessions: sessions.filter(s => s.status === 'pending').length,
      completedSessions: sessions.filter(s => s.status === 'complete').length,
      failedSessions: sessions.filter(s => s.status === 'error').length,
      cancelledSessions: sessions.filter(s => s.status === 'cancelled').length
    };
  }

  /**
   * Pausa todas las descargas activas
   */
  pauseAll(): void {
    console.log('⏸️ Pausing all downloads...');
    for (const session of this.activeSessions.values()) {
      if (session.status === 'downloading') {
        // Nota: La implementación real de pausa dependerá del wrapper de yt-dlp
        console.log(`⏸️ Pausing download: ${session.id}`);
      }
    }
  }

  /**
   * Reanuda todas las descargas pausadas
   */
  resumeAll(): void {
    console.log('▶️ Resuming all downloads...');
    this.processQueue();
  }
}