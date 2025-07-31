import path from 'path';

/**
 * Configuración base para el sistema de descarga de YouTube
 */
export const YOUTUBE_DOWNLOADER_CONFIG = {
  // Directorios
  TEMP_DIR: path.join(process.cwd(), 'temp', 'youtube-downloads'),
  STORAGE_DIR: path.join(process.cwd(), 'local-storage', 'videos'),
  
  // Límites de descarga
  MAX_CONCURRENT_DOWNLOADS: 3,
  MAX_FILE_SIZE_MB: 2048, // 2GB
  DOWNLOAD_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutos
  
  // Configuración de reintentos
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  BACKOFF_MULTIPLIER: 2,
  
  // User agents para evitar bloqueos - más variados y actualizados
  USER_AGENTS: [
    // Chrome variants
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    // Firefox variants
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
    // Safari variants
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    // Edge variants
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
    // Mobile variants
    'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
  ],

  // Configuración específica de pytube
  PYTUBE: {
    USE_OAUTH: false,
    USE_PO_TOKEN: false,
    ENABLE_LOGGING: true,
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  },

  // Configuración avanzada anti-bloqueo
  ANTI_BLOCKING: {
    MIN_DELAY_BETWEEN_REQUESTS: 1000, // 1 segundo mínimo
    MAX_DELAY_BETWEEN_REQUESTS: 5000, // 5 segundos máximo
    USE_RANDOM_DELAYS: true,
    MAX_ATTEMPTS_PER_STRATEGY: 3,
  },
  
  // Formatos de video soportados
  SUPPORTED_FORMATS: ['mp4', 'webm', 'mkv', 'avi', 'mov'],
  
  // Calidades predefinidas para pytube
  QUALITY_PRESETS: {
    highest: 'highest',
    high: 'high', 
    medium: 'medium',
    low: 'low'
  },
  
  // Dominios permitidos
  ALLOWED_DOMAINS: [
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
    'm.youtube.com'
  ]
} as const;

/**
 * Códigos de error específicos para descarga de YouTube
 */
export enum YouTubeDownloadError {
  INVALID_URL = 'INVALID_URL',
  VIDEO_UNAVAILABLE = 'VIDEO_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROXY_BLOCKED = 'PROXY_BLOCKED',
  INSUFFICIENT_SPACE = 'INSUFFICIENT_SPACE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  CANCELLED_BY_USER = 'CANCELLED_BY_USER',
  TIMEOUT = 'TIMEOUT',
  YTDLP_NOT_FOUND = 'YTDLP_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

/**
 * Mensajes de error amigables para el usuario
 */
export const ERROR_MESSAGES = {
  [YouTubeDownloadError.INVALID_URL]: 'La URL proporcionada no es válida. Asegúrate de usar una URL de YouTube.',
  [YouTubeDownloadError.VIDEO_UNAVAILABLE]: 'El video no está disponible. Puede ser privado, eliminado o restringido geográficamente.',
  [YouTubeDownloadError.NETWORK_ERROR]: 'Error de conexión. Verifica tu conexión a internet e inténtalo de nuevo.',
  [YouTubeDownloadError.PROXY_BLOCKED]: 'La descarga fue bloqueada. Esto puede deberse a restricciones de YouTube.',
  [YouTubeDownloadError.INSUFFICIENT_SPACE]: 'No hay suficiente espacio en disco para descargar el video.',
  [YouTubeDownloadError.UNSUPPORTED_FORMAT]: 'El formato del video no es compatible.',
  [YouTubeDownloadError.CANCELLED_BY_USER]: 'La descarga fue cancelada por el usuario.',
  [YouTubeDownloadError.TIMEOUT]: 'La descarga tardó demasiado tiempo y fue cancelada.',
  [YouTubeDownloadError.YTDLP_NOT_FOUND]: 'pytube no está instalado o no se puede encontrar.',
  [YouTubeDownloadError.PERMISSION_DENIED]: 'No se tienen permisos para escribir en el directorio de destino.',
  [YouTubeDownloadError.QUOTA_EXCEEDED]: 'Se ha excedido la cuota de descargas. Inténtalo más tarde.'
} as const;

/**
 * Tipos de estado de descarga
 */
export type DownloadStatus = 
  | 'pending' 
  | 'downloading' 
  | 'processing' 
  | 'complete' 
  | 'cancelled' 
  | 'error';

/**
 * Utilidades de configuración
 */
export class ConfigUtils {
  /**
   * Obtiene un user agent aleatorio para evitar bloqueos
   */
  static getRandomUserAgent(): string {
    const userAgents = YOUTUBE_DOWNLOADER_CONFIG.USER_AGENTS;
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Calcula el delay para reintentos con backoff exponencial
   */
  static getRetryDelay(attempt: number): number {
    const baseDelay = YOUTUBE_DOWNLOADER_CONFIG.RETRY_DELAY_MS;
    const multiplier = YOUTUBE_DOWNLOADER_CONFIG.BACKOFF_MULTIPLIER;
    return baseDelay * Math.pow(multiplier, attempt - 1);
  }

  /**
   * Valida si una URL es de YouTube
   */
  static isValidYouTubeUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return YOUTUBE_DOWNLOADER_CONFIG.ALLOWED_DOMAINS.includes(parsedUrl.hostname as any);
    } catch {
      return false;
    }
  }

  /**
   * Convierte bytes a formato legible
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Convierte segundos a formato de tiempo legible
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}