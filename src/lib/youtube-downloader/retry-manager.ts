import { ConfigUtils, YouTubeDownloadError, YOUTUBE_DOWNLOADER_CONFIG } from './config';

/**
 * Opciones para el sistema de reintentos
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

/**
 * Resultado de un intento de operación
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempt: number;
  totalAttempts: number;
}

/**
 * Gestor de reintentos con backoff exponencial y estrategias de recuperación
 */
export class RetryManager {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: YOUTUBE_DOWNLOADER_CONFIG.MAX_RETRIES,
    baseDelay: YOUTUBE_DOWNLOADER_CONFIG.RETRY_DELAY_MS,
    maxDelay: 30000, // 30 segundos máximo
    backoffMultiplier: YOUTUBE_DOWNLOADER_CONFIG.BACKOFF_MULTIPLIER,
    retryableErrors: [
      YouTubeDownloadError.NETWORK_ERROR,
      YouTubeDownloadError.PROXY_BLOCKED,
      YouTubeDownloadError.TIMEOUT,
      'HTTP Error 429', // Rate limit
      'HTTP Error 503', // Service unavailable
      'Connection reset',
      'Connection timeout'
    ]
  };

  /**
   * Ejecuta una operación con reintentos automáticos
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    const config = { ...RetryManager.DEFAULT_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${config.maxRetries + 1}`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        console.log(`❌ Attempt ${attempt} failed: ${lastError.message}`);
        
        // Si es el último intento, no reintentar
        if (attempt > config.maxRetries) {
          break;
        }

        // Verificar si el error es reintentable
        if (!RetryManager.isRetryableError(lastError, config.retryableErrors)) {
          console.log(`🚫 Error not retryable: ${lastError.message}`);
          throw lastError;
        }

        // Calcular delay con backoff exponencial
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        console.log(`⏳ Waiting ${delay}ms before retry...`);
        
        // Notificar callback de reintento
        onRetry?.(attempt, lastError);

        // Esperar antes del siguiente intento
        await RetryManager.delay(delay);
      }
    }

    console.log(`💥 All ${config.maxRetries + 1} attempts failed`);
    throw lastError!;
  }

  /**
   * Verifica si un error es reintentable
   */
  private static isRetryableError(error: Error, retryableErrors: string[]): boolean {
    const errorMessage = error.message.toLowerCase();
    
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  /**
   * Crea un delay asíncrono
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ejecuta una operación con reintentos y diferentes estrategias de user agent
   */
  static async executeWithUserAgentRotation<T>(
    operation: (userAgent: string) => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const userAgents = YOUTUBE_DOWNLOADER_CONFIG.USER_AGENTS;
    let userAgentIndex = 0;

    return RetryManager.executeWithRetry(
      async () => {
        const userAgent = userAgents[userAgentIndex % userAgents.length];
        console.log(`🕵️ Using user agent ${userAgentIndex + 1}/${userAgents.length}`);
        
        try {
          return await operation(userAgent);
        } catch (error) {
          // Rotar user agent para el siguiente intento
          userAgentIndex++;
          throw error;
        }
      },
      options,
      (attempt, error) => {
        console.log(`🔄 Rotating user agent for attempt ${attempt + 1}`);
      }
    );
  }

  /**
   * Ejecuta una operación con delays aleatorios para evitar detección
   */
  static async executeWithRandomDelay<T>(
    operation: () => Promise<T>,
    minDelay: number = 1000,
    maxDelay: number = 5000,
    options: RetryOptions = {}
  ): Promise<T> {
    return RetryManager.executeWithRetry(
      async () => {
        // Delay aleatorio antes de la operación
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        console.log(`⏳ Random delay: ${randomDelay}ms`);
        await RetryManager.delay(randomDelay);
        
        return await operation();
      },
      options
    );
  }

  /**
   * Crea una función de operación con timeout
   */
  static withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timeout'
  ): () => Promise<T> {
    return async (): Promise<T> => {
      return Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(timeoutMessage));
          }, timeoutMs);
        })
      ]);
    };
  }

  /**
   * Ejecuta múltiples estrategias de recuperación en secuencia
   */
  static async executeWithFallbackStrategies<T>(
    strategies: Array<() => Promise<T>>,
    strategyNames: string[] = []
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < strategies.length; i++) {
      const strategyName = strategyNames[i] || `Strategy ${i + 1}`;
      
      try {
        console.log(`🎯 Trying ${strategyName}...`);
        const result = await strategies[i]();
        
        if (i > 0) {
          console.log(`✅ ${strategyName} succeeded after ${i} failed attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ ${strategyName} failed: ${lastError.message}`);
        
        // Si no es la última estrategia, continuar
        if (i < strategies.length - 1) {
          console.log(`🔄 Trying next strategy...`);
          await RetryManager.delay(1000); // Pequeño delay entre estrategias
        }
      }
    }

    console.log(`💥 All ${strategies.length} strategies failed`);
    throw lastError!;
  }

  /**
   * Obtiene estadísticas de reintentos para debugging
   */
  static getRetryStats(attempts: number, totalTime: number): {
    attempts: number;
    totalTime: number;
    averageAttemptTime: number;
    successRate: number;
  } {
    return {
      attempts,
      totalTime,
      averageAttemptTime: totalTime / attempts,
      successRate: attempts > 0 ? (1 / attempts) * 100 : 0
    };
  }
}