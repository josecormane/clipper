import { YouTubeDownloadError, ERROR_MESSAGES } from './config';

/**
 * Información detallada sobre un error
 */
export interface ErrorInfo {
  code: YouTubeDownloadError;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  suggestedAction?: string;
  technicalDetails?: string;
}

/**
 * Contexto del error para mejor diagnóstico
 */
export interface ErrorContext {
  url?: string;
  operation?: string;
  attempt?: number;
  userAgent?: string;
  timestamp?: number;
}

/**
 * Manejador de errores especializado para YouTube y yt-dlp
 */
export class ErrorHandler {
  private static readonly ERROR_PATTERNS = [
    // Errores de video no disponible
    {
      patterns: [
        /video unavailable/i,
        /private video/i,
        /video has been removed/i,
        /this video is not available/i
      ],
      code: YouTubeDownloadError.VIDEO_UNAVAILABLE,
      isRetryable: false,
      suggestedAction: 'Verify the video URL and ensure the video is public and available.'
    },
    
    // Errores de red
    {
      patterns: [
        /network error/i,
        /connection error/i,
        /connection reset/i,
        /connection timeout/i,
        /unable to connect/i,
        /name resolution failed/i,
        /no route to host/i
      ],
      code: YouTubeDownloadError.NETWORK_ERROR,
      isRetryable: true,
      suggestedAction: 'Check your internet connection and try again.'
    },
    
    // Errores de proxy/bloqueo
    {
      patterns: [
        /http error 403/i,
        /forbidden/i,
        /blocked/i,
        /access denied/i,
        /sign in to confirm your age/i,
        /this video requires payment/i
      ],
      code: YouTubeDownloadError.PROXY_BLOCKED,
      isRetryable: true,
      suggestedAction: 'The video may be geo-blocked or require authentication. Try using a different network or VPN.'
    },
    
    // Errores de rate limiting
    {
      patterns: [
        /http error 429/i,
        /too many requests/i,
        /rate limit/i,
        /quota exceeded/i,
        /temporarily blocked/i
      ],
      code: YouTubeDownloadError.QUOTA_EXCEEDED,
      isRetryable: true,
      suggestedAction: 'YouTube is rate limiting requests. Wait a few minutes before trying again.'
    },
    
    // Errores de timeout
    {
      patterns: [
        /timeout/i,
        /timed out/i,
        /operation timeout/i,
        /read timeout/i
      ],
      code: YouTubeDownloadError.TIMEOUT,
      isRetryable: true,
      suggestedAction: 'The operation took too long. Try again with a more stable connection.'
    },
    
    // Errores de permisos
    {
      patterns: [
        /permission denied/i,
        /access is denied/i,
        /insufficient permissions/i,
        /cannot write to/i
      ],
      code: YouTubeDownloadError.PERMISSION_DENIED,
      isRetryable: false,
      suggestedAction: 'Check file system permissions for the download directory.'
    },
    
    // Errores de espacio en disco
    {
      patterns: [
        /no space left/i,
        /disk full/i,
        /insufficient disk space/i,
        /not enough space/i
      ],
      code: YouTubeDownloadError.INSUFFICIENT_SPACE,
      isRetryable: false,
      suggestedAction: 'Free up disk space and try again.'
    },
    
    // Errores de formato no soportado
    {
      patterns: [
        /unsupported format/i,
        /format not available/i,
        /no suitable format/i,
        /requested format not available/i
      ],
      code: YouTubeDownloadError.UNSUPPORTED_FORMAT,
      isRetryable: false,
      suggestedAction: 'Try selecting a different video quality or format.'
    },
    
    // Errores de yt-dlp no encontrado
    {
      patterns: [
        /yt-dlp.*not found/i,
        /command not found.*yt-dlp/i,
        /no such file.*yt-dlp/i
      ],
      code: YouTubeDownloadError.YTDLP_NOT_FOUND,
      isRetryable: false,
      suggestedAction: 'yt-dlp is not installed or not accessible. Please reinstall the application.'
    }
  ];

  /**
   * Analiza un error y devuelve información detallada
   */
  static analyzeError(error: Error | string, context?: ErrorContext): ErrorInfo {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    // Buscar patrón de error conocido
    for (const errorPattern of ErrorHandler.ERROR_PATTERNS) {
      for (const pattern of errorPattern.patterns) {
        if (pattern.test(errorMessage)) {
          return {
            code: errorPattern.code,
            message: errorMessage,
            userMessage: ERROR_MESSAGES[errorPattern.code],
            isRetryable: errorPattern.isRetryable,
            suggestedAction: errorPattern.suggestedAction,
            technicalDetails: ErrorHandler.buildTechnicalDetails(errorMessage, errorStack, context)
          };
        }
      }
    }

    // Error desconocido - clasificar como error de red por defecto si es reintentable
    const isNetworkRelated = ErrorHandler.isLikelyNetworkError(errorMessage);
    
    return {
      code: isNetworkRelated ? YouTubeDownloadError.NETWORK_ERROR : YouTubeDownloadError.NETWORK_ERROR,
      message: errorMessage,
      userMessage: isNetworkRelated 
        ? ERROR_MESSAGES[YouTubeDownloadError.NETWORK_ERROR]
        : `Unknown error: ${errorMessage}`,
      isRetryable: isNetworkRelated,
      suggestedAction: isNetworkRelated 
        ? 'Check your internet connection and try again.'
        : 'Please report this error if it persists.',
      technicalDetails: ErrorHandler.buildTechnicalDetails(errorMessage, errorStack, context)
    };
  }

  /**
   * Determina si un error es probablemente relacionado con la red
   */
  private static isLikelyNetworkError(errorMessage: string): boolean {
    const networkKeywords = [
      'connection', 'network', 'timeout', 'dns', 'resolve',
      'socket', 'http', 'ssl', 'tls', 'certificate'
    ];

    const lowerMessage = errorMessage.toLowerCase();
    return networkKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Construye detalles técnicos para debugging
   */
  private static buildTechnicalDetails(
    errorMessage: string, 
    errorStack?: string, 
    context?: ErrorContext
  ): string {
    const details: string[] = [];
    
    details.push(`Error: ${errorMessage}`);
    
    if (context) {
      if (context.url) details.push(`URL: ${context.url}`);
      if (context.operation) details.push(`Operation: ${context.operation}`);
      if (context.attempt) details.push(`Attempt: ${context.attempt}`);
      if (context.userAgent) details.push(`User Agent: ${context.userAgent.substring(0, 50)}...`);
      if (context.timestamp) details.push(`Timestamp: ${new Date(context.timestamp).toISOString()}`);
    }
    
    if (errorStack) {
      details.push(`Stack: ${errorStack}`);
    }
    
    return details.join('\n');
  }

  /**
   * Crea un error personalizado con información adicional
   */
  static createEnhancedError(
    originalError: Error | string,
    context?: ErrorContext
  ): EnhancedError {
    const errorInfo = ErrorHandler.analyzeError(originalError, context);
    return new EnhancedError(errorInfo, context);
  }

  /**
   * Determina la estrategia de recuperación recomendada
   */
  static getRecoveryStrategy(errorInfo: ErrorInfo): RecoveryStrategy {
    switch (errorInfo.code) {
      case YouTubeDownloadError.PROXY_BLOCKED:
        return {
          type: 'user_agent_rotation',
          description: 'Try different user agents and add random delays',
          shouldRetry: true,
          maxRetries: 5,
          baseDelay: 3000
        };

      case YouTubeDownloadError.QUOTA_EXCEEDED:
        return {
          type: 'exponential_backoff',
          description: 'Wait with exponential backoff due to rate limiting',
          shouldRetry: true,
          maxRetries: 3,
          baseDelay: 10000
        };

      case YouTubeDownloadError.NETWORK_ERROR:
        return {
          type: 'standard_retry',
          description: 'Standard retry with backoff for network issues',
          shouldRetry: true,
          maxRetries: 3,
          baseDelay: 2000
        };

      case YouTubeDownloadError.TIMEOUT:
        return {
          type: 'timeout_retry',
          description: 'Retry with increased timeout',
          shouldRetry: true,
          maxRetries: 2,
          baseDelay: 5000
        };

      default:
        return {
          type: 'no_retry',
          description: 'Error is not recoverable',
          shouldRetry: false,
          maxRetries: 0,
          baseDelay: 0
        };
    }
  }

  /**
   * Registra un error con contexto completo
   */
  static logError(errorInfo: ErrorInfo, context?: ErrorContext): void {
    console.error('🚨 YouTube Download Error:');
    console.error(`   Code: ${errorInfo.code}`);
    console.error(`   Message: ${errorInfo.message}`);
    console.error(`   User Message: ${errorInfo.userMessage}`);
    console.error(`   Retryable: ${errorInfo.isRetryable}`);
    
    if (errorInfo.suggestedAction) {
      console.error(`   Suggested Action: ${errorInfo.suggestedAction}`);
    }
    
    if (context) {
      console.error('   Context:');
      if (context.url) console.error(`     URL: ${context.url}`);
      if (context.operation) console.error(`     Operation: ${context.operation}`);
      if (context.attempt) console.error(`     Attempt: ${context.attempt}`);
    }
    
    if (errorInfo.technicalDetails) {
      console.error('   Technical Details:');
      console.error(errorInfo.technicalDetails.split('\n').map(line => `     ${line}`).join('\n'));
    }
  }
}

/**
 * Estrategia de recuperación recomendada
 */
export interface RecoveryStrategy {
  type: 'user_agent_rotation' | 'exponential_backoff' | 'standard_retry' | 'timeout_retry' | 'no_retry';
  description: string;
  shouldRetry: boolean;
  maxRetries: number;
  baseDelay: number;
}

/**
 * Error mejorado con información adicional
 */
export class EnhancedError extends Error {
  public readonly errorInfo: ErrorInfo;
  public readonly context?: ErrorContext;
  public readonly recoveryStrategy: RecoveryStrategy;

  constructor(errorInfo: ErrorInfo, context?: ErrorContext) {
    super(errorInfo.userMessage);
    this.name = 'EnhancedError';
    this.errorInfo = errorInfo;
    this.context = context;
    this.recoveryStrategy = ErrorHandler.getRecoveryStrategy(errorInfo);
  }

  /**
   * Obtiene un resumen del error para logging
   */
  getSummary(): string {
    return `${this.errorInfo.code}: ${this.errorInfo.userMessage}`;
  }

  /**
   * Obtiene detalles completos del error
   */
  getDetails(): string {
    return this.errorInfo.technicalDetails || this.message;
  }

  /**
   * Determina si el error es reintentable
   */
  isRetryable(): boolean {
    return this.errorInfo.isRetryable;
  }
}