import fs from 'fs';
import path from 'path';
import { YOUTUBE_DOWNLOADER_CONFIG } from './config';

/**
 * Configuración avanzada del sistema de descarga de YouTube
 */
export interface AdvancedConfig {
  // Límites de rendimiento
  performance: {
    maxConcurrentDownloads: number;
    maxConcurrentInfoExtractions: number;
    downloadQueueSize: number;
    memoryLimitMB: number;
    diskSpaceLimitGB: number;
    networkTimeoutMs: number;
    retryDelayMultiplier: number;
  };

  // Configuración de calidad y formatos
  quality: {
    defaultQuality: 'highest' | 'high' | 'medium' | 'low';
    maxResolution: number; // 720, 1080, 1440, 2160
    preferredFormats: string[];
    audioQuality: 'best' | 'good' | 'acceptable';
    enableHDR: boolean;
    enable60fps: boolean;
  };

  // Configuración anti-bloqueo
  antiBlocking: {
    enableUserAgentRotation: boolean;
    enableRandomDelays: boolean;
    enableProxyRotation: boolean;
    enableCookieManagement: boolean;
    minDelayMs: number;
    maxDelayMs: number;
    maxRetriesPerStrategy: number;
    enableAlternativeExtractors: boolean;
    enableMobileSimulation: boolean;
  };

  // Configuración de almacenamiento
  storage: {
    tempDirectory: string;
    finalDirectory: string;
    enableCompression: boolean;
    compressionLevel: number;
    enableDuplicateDetection: boolean;
    enableMetadataExtraction: boolean;
    enableThumbnailDownload: boolean;
    enableSubtitleDownload: boolean;
  };

  // Configuración de logging
  logging: {
    enableDebugLogging: boolean;
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    enableFileLogging: boolean;
    maxLogFileSizeMB: number;
    maxLogFiles: number;
    enablePerformanceLogging: boolean;
  };

  // Configuración de notificaciones
  notifications: {
    enableDesktopNotifications: boolean;
    enableSoundNotifications: boolean;
    enableProgressNotifications: boolean;
    notificationDurationMs: number;
    enableErrorNotifications: boolean;
  };

  // Configuración experimental
  experimental: {
    enableMachineLearning: boolean;
    enablePredictiveRetries: boolean;
    enableAdaptiveQuality: boolean;
    enableBandwidthOptimization: boolean;
    enableCDNFallback: boolean;
  };
}

/**
 * Configuración por defecto
 */
const DEFAULT_ADVANCED_CONFIG: AdvancedConfig = {
  performance: {
    maxConcurrentDownloads: 3,
    maxConcurrentInfoExtractions: 5,
    downloadQueueSize: 10,
    memoryLimitMB: 1024, // 1GB
    diskSpaceLimitGB: 10, // 10GB
    networkTimeoutMs: 120000, // 2 minutos
    retryDelayMultiplier: 2
  },

  quality: {
    defaultQuality: 'high',
    maxResolution: 1080,
    preferredFormats: ['mp4', 'webm', 'mkv'],
    audioQuality: 'best',
    enableHDR: false,
    enable60fps: true
  },

  antiBlocking: {
    enableUserAgentRotation: true,
    enableRandomDelays: true,
    enableProxyRotation: false,
    enableCookieManagement: true,
    minDelayMs: 1000,
    maxDelayMs: 8000,
    maxRetriesPerStrategy: 4,
    enableAlternativeExtractors: true,
    enableMobileSimulation: true
  },

  storage: {
    tempDirectory: path.join(process.cwd(), 'temp', 'youtube-downloads'),
    finalDirectory: path.join(process.cwd(), 'local-storage', 'videos'),
    enableCompression: false,
    compressionLevel: 6,
    enableDuplicateDetection: true,
    enableMetadataExtraction: true,
    enableThumbnailDownload: true,
    enableSubtitleDownload: false
  },

  logging: {
    enableDebugLogging: process.env.NODE_ENV === 'development',
    logLevel: 'INFO',
    enableFileLogging: true,
    maxLogFileSizeMB: 10,
    maxLogFiles: 5,
    enablePerformanceLogging: true
  },

  notifications: {
    enableDesktopNotifications: false,
    enableSoundNotifications: false,
    enableProgressNotifications: true,
    notificationDurationMs: 5000,
    enableErrorNotifications: true
  },

  experimental: {
    enableMachineLearning: false,
    enablePredictiveRetries: false,
    enableAdaptiveQuality: false,
    enableBandwidthOptimization: false,
    enableCDNFallback: false
  }
};

/**
 * Gestor de configuración avanzada
 */
export class AdvancedConfigManager {
  private static instance: AdvancedConfigManager;
  private config: AdvancedConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), '.kiro', 'youtube-downloader-config.json');
    this.config = this.loadConfig();
  }

  static getInstance(): AdvancedConfigManager {
    if (!AdvancedConfigManager.instance) {
      AdvancedConfigManager.instance = new AdvancedConfigManager();
    }
    return AdvancedConfigManager.instance;
  }

  /**
   * Carga la configuración desde archivo o usa la por defecto
   */
  private loadConfig(): AdvancedConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(configData);
        
        // Merge con configuración por defecto para asegurar que todos los campos existen
        return this.mergeConfigs(DEFAULT_ADVANCED_CONFIG, loadedConfig);
      }
    } catch (error) {
      console.warn('Failed to load advanced config, using defaults:', error);
    }

    return { ...DEFAULT_ADVANCED_CONFIG };
  }

  /**
   * Combina configuraciones recursivamente
   */
  private mergeConfigs(defaultConfig: any, userConfig: any): any {
    const result = { ...defaultConfig };

    for (const key in userConfig) {
      if (userConfig.hasOwnProperty(key)) {
        if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
          result[key] = this.mergeConfigs(defaultConfig[key] || {}, userConfig[key]);
        } else {
          result[key] = userConfig[key];
        }
      }
    }

    return result;
  }

  /**
   * Guarda la configuración actual
   */
  async saveConfig(): Promise<void> {
    try {
      // Crear directorio si no existe
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const configData = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf8');
      
      console.log('✅ Advanced configuration saved');
    } catch (error) {
      console.error('❌ Failed to save advanced configuration:', error);
      throw error;
    }
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): AdvancedConfig {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(updates: Partial<AdvancedConfig>): void {
    this.config = this.mergeConfigs(this.config, updates);
  }

  /**
   * Resetea a configuración por defecto
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_ADVANCED_CONFIG };
  }

  /**
   * Valida la configuración actual
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar límites de rendimiento
    if (this.config.performance.maxConcurrentDownloads < 1 || this.config.performance.maxConcurrentDownloads > 10) {
      errors.push('maxConcurrentDownloads must be between 1 and 10');
    }

    if (this.config.performance.memoryLimitMB < 256) {
      errors.push('memoryLimitMB must be at least 256MB');
    }

    if (this.config.performance.diskSpaceLimitGB < 1) {
      errors.push('diskSpaceLimitGB must be at least 1GB');
    }

    // Validar configuración de calidad
    if (![720, 1080, 1440, 2160].includes(this.config.quality.maxResolution)) {
      errors.push('maxResolution must be one of: 720, 1080, 1440, 2160');
    }

    // Validar configuración anti-bloqueo
    if (this.config.antiBlocking.minDelayMs >= this.config.antiBlocking.maxDelayMs) {
      errors.push('minDelayMs must be less than maxDelayMs');
    }

    if (this.config.antiBlocking.maxRetriesPerStrategy < 1 || this.config.antiBlocking.maxRetriesPerStrategy > 10) {
      errors.push('maxRetriesPerStrategy must be between 1 and 10');
    }

    // Validar directorios
    try {
      if (!fs.existsSync(path.dirname(this.config.storage.tempDirectory))) {
        errors.push('tempDirectory parent path does not exist');
      }
      if (!fs.existsSync(path.dirname(this.config.storage.finalDirectory))) {
        errors.push('finalDirectory parent path does not exist');
      }
    } catch (error) {
      errors.push('Invalid directory paths');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtiene configuración optimizada para el entorno actual
   */
  getOptimizedConfig(): AdvancedConfig {
    const optimized = { ...this.config };

    // Detectar recursos del sistema
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const cpuCount = require('os').cpus().length;

    // Ajustar límites basados en recursos disponibles
    if (totalMemory < 4 * 1024 * 1024 * 1024) { // Menos de 4GB RAM
      optimized.performance.maxConcurrentDownloads = Math.min(2, optimized.performance.maxConcurrentDownloads);
      optimized.performance.memoryLimitMB = Math.min(512, optimized.performance.memoryLimitMB);
    }

    if (cpuCount <= 2) {
      optimized.performance.maxConcurrentInfoExtractions = Math.min(3, optimized.performance.maxConcurrentInfoExtractions);
    }

    // Ajustar configuración anti-bloqueo basada en el entorno
    if (process.env.NODE_ENV === 'production') {
      optimized.antiBlocking.enableRandomDelays = true;
      optimized.antiBlocking.maxRetriesPerStrategy = Math.max(3, optimized.antiBlocking.maxRetriesPerStrategy);
    }

    return optimized;
  }

  /**
   * Obtiene estadísticas de uso de la configuración
   */
  getUsageStats(): {
    configVersion: string;
    lastModified: Date;
    validationStatus: { isValid: boolean; errors: string[] };
    optimizationSuggestions: string[];
  } {
    const validation = this.validateConfig();
    const suggestions: string[] = [];

    // Generar sugerencias de optimización
    if (this.config.performance.maxConcurrentDownloads > 5) {
      suggestions.push('Consider reducing maxConcurrentDownloads to avoid overwhelming the system');
    }

    if (!this.config.antiBlocking.enableUserAgentRotation) {
      suggestions.push('Enable user agent rotation to improve success rates');
    }

    if (!this.config.storage.enableDuplicateDetection) {
      suggestions.push('Enable duplicate detection to save storage space');
    }

    if (this.config.logging.logLevel === 'DEBUG' && process.env.NODE_ENV === 'production') {
      suggestions.push('Consider changing log level from DEBUG in production');
    }

    let lastModified = new Date();
    try {
      if (fs.existsSync(this.configPath)) {
        const stats = fs.statSync(this.configPath);
        lastModified = stats.mtime;
      }
    } catch (error) {
      // Use current date if file stats unavailable
    }

    return {
      configVersion: '1.0.0',
      lastModified,
      validationStatus: validation,
      optimizationSuggestions: suggestions
    };
  }

  /**
   * Exporta configuración para backup
   */
  exportConfig(): string {
    return JSON.stringify({
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      config: this.config
    }, null, 2);
  }

  /**
   * Importa configuración desde backup
   */
  importConfig(configData: string): void {
    try {
      const imported = JSON.parse(configData);
      
      if (imported.config) {
        this.config = this.mergeConfigs(DEFAULT_ADVANCED_CONFIG, imported.config);
        console.log('✅ Configuration imported successfully');
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      console.error('❌ Failed to import configuration:', error);
      throw error;
    }
  }
}

/**
 * Utilidades de configuración
 */
export class ConfigUtils {
  /**
   * Obtiene configuración de yt-dlp basada en la configuración avanzada
   */
  static getYtDlpOptions(config: AdvancedConfig): string[] {
    const options: string[] = [];

    // Configuración de calidad
    if (config.quality.maxResolution <= 720) {
      options.push('--format', 'best[height<=720]');
    } else if (config.quality.maxResolution <= 1080) {
      options.push('--format', 'best[height<=1080]');
    } else {
      options.push('--format', 'best');
    }

    // Configuración anti-bloqueo
    if (config.antiBlocking.enableRandomDelays) {
      options.push('--sleep-interval', '2');
      options.push('--max-sleep-interval', '8');
    }

    if (config.antiBlocking.enableCookieManagement) {
      options.push('--cookies-from-browser', 'chrome');
    }

    // Configuración de red
    options.push('--socket-timeout', (config.performance.networkTimeoutMs / 1000).toString());
    options.push('--retries', config.antiBlocking.maxRetriesPerStrategy.toString());

    // Configuración de subtítulos
    if (config.storage.enableSubtitleDownload) {
      options.push('--write-subs');
      options.push('--write-auto-subs');
    }

    return options;
  }

  /**
   * Obtiene configuración de descarga optimizada
   */
  static getOptimizedDownloadOptions(config: AdvancedConfig, videoInfo: any): {
    quality: string;
    format: string;
    maxFileSize?: number;
  } {
    let quality = config.quality.defaultQuality;
    let format = config.quality.preferredFormats[0] || 'mp4';

    // Ajustar calidad basada en duración del video
    if (videoInfo.duration > 3600) { // Videos de más de 1 hora
      if (quality === 'highest') quality = 'high';
      if (quality === 'high') quality = 'medium';
    }

    // Ajustar formato basado en disponibilidad
    const availableFormats = videoInfo.formats?.map((f: any) => f.ext) || [];
    const preferredFormat = config.quality.preferredFormats.find(f => availableFormats.includes(f));
    if (preferredFormat) {
      format = preferredFormat;
    }

    // Calcular límite de tamaño de archivo
    let maxFileSize: number | undefined;
    if (config.storage.enableCompression) {
      maxFileSize = Math.floor(config.performance.diskSpaceLimitGB * 1024 * 1024 * 1024 * 0.1); // 10% del límite
    }

    return { quality, format, maxFileSize };
  }
}

// Instancia singleton
export const advancedConfig = AdvancedConfigManager.getInstance();

// Funciones de conveniencia
export function getAdvancedConfig(): AdvancedConfig {
  return advancedConfig.getConfig();
}

export function updateAdvancedConfig(updates: Partial<AdvancedConfig>): void {
  advancedConfig.updateConfig(updates);
}

export async function saveAdvancedConfig(): Promise<void> {
  await advancedConfig.saveConfig();
}