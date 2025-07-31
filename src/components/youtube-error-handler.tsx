'use client';

import React from 'react';
import { AlertCircle, RefreshCw, ExternalLink, Info, Wifi, Shield, Clock } from 'lucide-react';
import { YouTubeDownloadError } from '@/lib/youtube-downloader/config';

interface YouTubeErrorHandlerProps {
  error: string;
  url?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

interface ErrorInfo {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  suggestions: string[];
  canRetry: boolean;
  severity: 'error' | 'warning' | 'info';
}

const ERROR_INFO_MAP: Record<string, ErrorInfo> = {
  [YouTubeDownloadError.PROXY_BLOCKED]: {
    title: 'Descarga Bloqueada',
    description: 'YouTube está bloqueando las descargas desde tu ubicación o red.',
    icon: <Shield className="w-5 h-5" />,
    color: 'text-red-500',
    suggestions: [
      'Intenta usar una VPN o cambiar de red',
      'Espera unos minutos antes de intentar de nuevo',
      'Verifica que el video sea público y esté disponible',
      'Prueba con un video diferente para confirmar el problema'
    ],
    canRetry: true,
    severity: 'error'
  },
  [YouTubeDownloadError.VIDEO_UNAVAILABLE]: {
    title: 'Video No Disponible',
    description: 'El video no se puede acceder. Puede ser privado, eliminado o restringido.',
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'text-orange-500',
    suggestions: [
      'Verifica que la URL del video sea correcta',
      'Confirma que el video sea público',
      'Intenta acceder al video directamente en YouTube',
      'El video puede haber sido eliminado o marcado como privado'
    ],
    canRetry: false,
    severity: 'warning'
  },
  [YouTubeDownloadError.NETWORK_ERROR]: {
    title: 'Error de Conexión',
    description: 'No se pudo establecer conexión con YouTube.',
    icon: <Wifi className="w-5 h-5" />,
    color: 'text-blue-500',
    suggestions: [
      'Verifica tu conexión a internet',
      'Intenta recargar la página',
      'Comprueba si YouTube está accesible desde tu navegador',
      'Espera unos momentos y vuelve a intentar'
    ],
    canRetry: true,
    severity: 'error'
  },
  [YouTubeDownloadError.TIMEOUT]: {
    title: 'Tiempo de Espera Agotado',
    description: 'La descarga tardó demasiado tiempo en completarse.',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-yellow-500',
    suggestions: [
      'Intenta con un video más corto',
      'Selecciona una calidad de video menor',
      'Verifica la velocidad de tu conexión a internet',
      'Intenta descargar en un momento con menos tráfico de red'
    ],
    canRetry: true,
    severity: 'warning'
  },
  [YouTubeDownloadError.INVALID_URL]: {
    title: 'URL Inválida',
    description: 'La URL proporcionada no es válida o no es de YouTube.',
    icon: <ExternalLink className="w-5 h-5" />,
    color: 'text-red-500',
    suggestions: [
      'Asegúrate de usar una URL completa de YouTube',
      'Formatos válidos: youtube.com/watch?v=... o youtu.be/...',
      'Copia la URL directamente desde YouTube',
      'Verifica que no haya caracteres extra o espacios'
    ],
    canRetry: false,
    severity: 'error'
  },
  [YouTubeDownloadError.QUOTA_EXCEEDED]: {
    title: 'Límite de Descargas Excedido',
    description: 'Se ha alcanzado el límite de descargas permitidas.',
    icon: <AlertCircle className="w-5 h-5" />,
    color: 'text-purple-500',
    suggestions: [
      'Espera unas horas antes de intentar de nuevo',
      'YouTube puede tener límites temporales',
      'Intenta con una red diferente',
      'Considera usar el video en una calidad menor'
    ],
    canRetry: true,
    severity: 'warning'
  }
};

const DEFAULT_ERROR_INFO: ErrorInfo = {
  title: 'Error Desconocido',
  description: 'Ocurrió un error inesperado durante la descarga.',
  icon: <AlertCircle className="w-5 h-5" />,
  color: 'text-gray-500',
  suggestions: [
    'Intenta recargar la página',
    'Verifica tu conexión a internet',
    'Prueba con un video diferente',
    'Contacta soporte si el problema persiste'
  ],
  canRetry: true,
  severity: 'error'
};

export function YouTubeErrorHandler({
  error,
  url,
  onRetry,
  onDismiss,
  retryCount = 0,
  maxRetries = 3
}: YouTubeErrorHandlerProps) {
  const errorInfo = ERROR_INFO_MAP[error] || DEFAULT_ERROR_INFO;
  const canRetryMore = retryCount < maxRetries;
  const showRetry = errorInfo.canRetry && canRetryMore && onRetry;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getSeverityStyles(errorInfo.severity)}`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 ${errorInfo.color}`}>
          {errorInfo.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">
              {errorInfo.title}
            </h3>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          
          <p className="mt-1 text-sm text-gray-600">
            {errorInfo.description}
          </p>

          {retryCount > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Intento {retryCount} de {maxRetries}
            </p>
          )}

          {url && (
            <div className="mt-2 text-xs text-gray-500 break-all">
              <strong>URL:</strong> {url}
            </div>
          )}

          <div className="mt-3">
            <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
              <Info className="w-3 h-3" />
              <span className="font-medium">Posibles soluciones:</span>
            </div>
            
            <ul className="text-xs text-gray-600 space-y-1 ml-5">
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="list-disc">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {showRetry && (
            <div className="mt-4 flex space-x-2">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reintentar
              </button>
              
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Ver en YouTube
                </a>
              )}
            </div>
          )}

          {!canRetryMore && errorInfo.canRetry && (
            <div className="mt-3 text-xs text-gray-500">
              Se alcanzó el límite máximo de reintentos. Prueba las sugerencias anteriores.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default YouTubeErrorHandler;