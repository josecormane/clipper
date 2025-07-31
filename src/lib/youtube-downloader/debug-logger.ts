import fs from 'fs';
import path from 'path';

/**
 * Niveles de logging
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Entrada de log
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  sessionId?: string;
  url?: string;
  error?: Error;
}

/**
 * Configuración del logger
 */
export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  maxFileSize: number; // en bytes
  maxFiles: number;
  logDirectory: string;
  enableConsole: boolean;
  enableFile: boolean;
}

/**
 * Logger especializado para debugging de descargas de YouTube
 */
export class DebugLogger {
  private static instance: DebugLogger;
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      level: LogLevel.DEBUG,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      logDirectory: path.join(process.cwd(), 'logs', 'youtube-downloader'),
      enableConsole: true,
      enableFile: true
    };

    this.ensureLogDirectory();
    this.startFlushTimer();
  }

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  /**
   * Configura el logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.ensureLogDirectory();
  }

  /**
   * Log de debug
   */
  debug(category: string, message: string, data?: any, sessionId?: string, url?: string): void {
    this.log(LogLevel.DEBUG, category, message, data, sessionId, url);
  }

  /**
   * Log de información
   */
  info(category: string, message: string, data?: any, sessionId?: string, url?: string): void {
    this.log(LogLevel.INFO, category, message, data, sessionId, url);
  }

  /**
   * Log de advertencia
   */
  warn(category: string, message: string, data?: any, sessionId?: string, url?: string): void {
    this.log(LogLevel.WARN, category, message, data, sessionId, url);
  }

  /**
   * Log de error
   */
  error(category: string, message: string, error?: Error, data?: any, sessionId?: string, url?: string): void {
    this.log(LogLevel.ERROR, category, message, data, sessionId, url, error);
  }

  /**
   * Log genérico
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    sessionId?: string,
    url?: string,
    error?: Error
  ): void {
    if (!this.config.enabled || level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      sessionId,
      url,
      error
    };

    this.logBuffer.push(entry);

    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Flush inmediato para errores
    if (level === LogLevel.ERROR) {
      this.flush();
    }
  }

  /**
   * Log a consola con formato
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelStr = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelStr}] [${entry.category}]`;
    
    let message = `${prefix} ${entry.message}`;
    
    if (entry.sessionId) {
      message += ` (Session: ${entry.sessionId})`;
    }
    
    if (entry.url) {
      message += ` (URL: ${entry.url})`;
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(message, entry.error || entry.data || '');
        if (entry.error?.stack) {
          console.error('Stack trace:', entry.error.stack);
        }
        break;
    }
  }

  /**
   * Flush del buffer a archivo
   */
  private flush(): void {
    if (!this.config.enableFile || this.logBuffer.length === 0) {
      return;
    }

    try {
      const logFile = this.getCurrentLogFile();
      const logLines = this.logBuffer.map(entry => this.formatLogEntry(entry));
      const logContent = logLines.join('\n') + '\n';

      fs.appendFileSync(logFile, logContent, 'utf8');
      this.logBuffer = [];

      // Rotar archivos si es necesario
      this.rotateLogsIfNeeded();
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Formatea una entrada de log para archivo
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelStr = LogLevel[entry.level].padEnd(5);
    const category = entry.category.padEnd(15);
    
    let line = `${timestamp} ${levelStr} ${category} ${entry.message}`;
    
    if (entry.sessionId) {
      line += ` | Session: ${entry.sessionId}`;
    }
    
    if (entry.url) {
      line += ` | URL: ${entry.url}`;
    }
    
    if (entry.data) {
      try {
        line += ` | Data: ${JSON.stringify(entry.data)}`;
      } catch {
        line += ` | Data: [Circular or non-serializable]`;
      }
    }
    
    if (entry.error) {
      line += ` | Error: ${entry.error.message}`;
      if (entry.error.stack) {
        line += ` | Stack: ${entry.error.stack.replace(/\n/g, ' | ')}`;
      }
    }

    return line;
  }

  /**
   * Obtiene el archivo de log actual
   */
  private getCurrentLogFile(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.config.logDirectory, `youtube-downloader-${date}.log`);
  }

  /**
   * Rota archivos de log si exceden el tamaño máximo
   */
  private rotateLogsIfNeeded(): void {
    try {
      const logFile = this.getCurrentLogFile();
      
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        
        if (stats.size > this.config.maxFileSize) {
          const timestamp = Date.now();
          const rotatedFile = logFile.replace('.log', `-${timestamp}.log`);
          fs.renameSync(logFile, rotatedFile);
        }
      }

      // Limpiar archivos antiguos
      this.cleanOldLogFiles();
    } catch (error) {
      console.error('Failed to rotate log files:', error);
    }
  }

  /**
   * Limpia archivos de log antiguos
   */
  private cleanOldLogFiles(): void {
    try {
      const files = fs.readdirSync(this.config.logDirectory);
      const logFiles = files
        .filter(file => file.startsWith('youtube-downloader-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDirectory, file),
          mtime: fs.statSync(path.join(this.config.logDirectory, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Mantener solo los archivos más recientes
      if (logFiles.length > this.config.maxFiles) {
        const filesToDelete = logFiles.slice(this.config.maxFiles);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Failed to clean old log files:', error);
    }
  }

  /**
   * Asegura que el directorio de logs existe
   */
  private ensureLogDirectory(): void {
    if (this.config.enableFile) {
      try {
        if (!fs.existsSync(this.config.logDirectory)) {
          fs.mkdirSync(this.config.logDirectory, { recursive: true });
        }
      } catch (error) {
        console.error('Failed to create log directory:', error);
        this.config.enableFile = false;
      }
    }
  }

  /**
   * Inicia el timer para flush periódico
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, 5000); // Flush cada 5 segundos
  }

  /**
   * Detiene el logger y hace flush final
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }

  /**
   * Obtiene estadísticas de logging
   */
  getStats(): {
    bufferSize: number;
    logDirectory: string;
    config: LoggerConfig;
  } {
    return {
      bufferSize: this.logBuffer.length,
      logDirectory: this.config.logDirectory,
      config: { ...this.config }
    };
  }

  /**
   * Lee logs recientes
   */
  getRecentLogs(lines: number = 100): LogEntry[] {
    try {
      const logFile = this.getCurrentLogFile();
      
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const logLines = content.trim().split('\n').slice(-lines);
      
      return logLines.map(line => this.parseLogLine(line)).filter(Boolean) as LogEntry[];
    } catch (error) {
      console.error('Failed to read recent logs:', error);
      return [];
    }
  }

  /**
   * Parsea una línea de log
   */
  private parseLogLine(line: string): LogEntry | null {
    try {
      const parts = line.split(' | ');
      const mainPart = parts[0];
      const [timestamp, level, category, ...messageParts] = mainPart.split(' ');
      
      const entry: LogEntry = {
        timestamp: new Date(timestamp).getTime(),
        level: LogLevel[level.trim() as keyof typeof LogLevel] || LogLevel.INFO,
        category: category.trim(),
        message: messageParts.join(' ')
      };

      // Parsear campos adicionales
      parts.slice(1).forEach(part => {
        if (part.startsWith('Session: ')) {
          entry.sessionId = part.substring(9);
        } else if (part.startsWith('URL: ')) {
          entry.url = part.substring(5);
        } else if (part.startsWith('Data: ')) {
          try {
            entry.data = JSON.parse(part.substring(6));
          } catch {
            entry.data = part.substring(6);
          }
        } else if (part.startsWith('Error: ')) {
          entry.error = new Error(part.substring(7));
        }
      });

      return entry;
    } catch {
      return null;
    }
  }
}

// Instancia singleton
export const debugLogger = DebugLogger.getInstance();

// Funciones de conveniencia
export const logDebug = (category: string, message: string, data?: any, sessionId?: string, url?: string) => {
  debugLogger.debug(category, message, data, sessionId, url);
};

export const logInfo = (category: string, message: string, data?: any, sessionId?: string, url?: string) => {
  debugLogger.info(category, message, data, sessionId, url);
};

export const logWarn = (category: string, message: string, data?: any, sessionId?: string, url?: string) => {
  debugLogger.warn(category, message, data, sessionId, url);
};

export const logError = (category: string, message: string, error?: Error, data?: any, sessionId?: string, url?: string) => {
  debugLogger.error(category, message, error, data, sessionId, url);
};

// Cleanup al cerrar la aplicación
process.on('exit', () => {
  debugLogger.shutdown();
});

process.on('SIGINT', () => {
  debugLogger.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  debugLogger.shutdown();
  process.exit(0);
});