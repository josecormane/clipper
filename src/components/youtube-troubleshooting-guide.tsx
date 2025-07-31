'use client';

import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  Wifi, 
  Shield, 
  Clock, 
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface TroubleshootingItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  severity: 'high' | 'medium' | 'low';
  solutions: {
    title: string;
    steps: string[];
    difficulty: 'easy' | 'medium' | 'advanced';
  }[];
  commonCauses: string[];
  relatedErrors: string[];
}

const TROUBLESHOOTING_ITEMS: TroubleshootingItem[] = [
  {
    id: 'proxy-blocked',
    title: 'Descargas Bloqueadas (HTTP 403) - ¿Por qué funciona en el navegador?',
    description: 'YouTube bloquea descargas automatizadas pero permite streaming en navegador. Es inconsistente pero tiene razones técnicas.',
    icon: <Shield className="w-5 h-5" />,
    severity: 'high',
    solutions: [
      {
        title: '¿Por qué funciona en el navegador pero no la descarga?',
        difficulty: 'easy',
        steps: [
          'Tu navegador tiene cookies y sesión activa - YouTube "confía" en él',
          'El navegador reproduce en streaming (fragmentos pequeños)',
          'yt-dlp intenta descargar el archivo completo de una vez',
          'YouTube detecta patrones automatizados vs comportamiento humano',
          'El navegador envía headers y requests más realistas'
        ]
      },
      {
        title: 'Nueva Solución: Cobalt.tools API',
        difficulty: 'easy',
        steps: [
          'Ahora usamos Cobalt.tools como primera opción - es MUY efectivo',
          'Cobalt es un servicio open source especializado en descargas',
          'Funciona mejor que yt-dlp porque ellos manejan el anti-blocking',
          'Se ejecuta automáticamente como primera estrategia',
          'Si Cobalt falla, el sistema prueba 8+ estrategias adicionales'
        ]
      },
      {
        title: 'Soluciones Técnicas Avanzadas',
        difficulty: 'medium',
        steps: [
          'El sistema ahora usa 9+ estrategias diferentes automáticamente',
          'Primera: Cobalt.tools API (más efectiva)',
          'Incluye simulación de navegador con cookies reales',
          'Descarga por fragmentos (como hace el navegador)',
          'Métodos de extracción directa más sigilosos',
          'Fallback a solo audio si el video falla',
          'Delays largos y throttling para parecer humano'
        ]
      },
      {
        title: 'Cambiar de Red o Usar VPN',
        difficulty: 'easy',
        steps: [
          'Intenta conectarte a una red WiFi diferente',
          'Usa datos móviles en lugar de WiFi',
          'Considera usar una VPN confiable',
          'Cambia la ubicación del servidor VPN si ya usas una'
        ]
      },
      {
        title: 'Esperar y Reintentar',
        difficulty: 'easy',
        steps: [
          'Espera 15-30 minutos antes de intentar de nuevo',
          'Los bloqueos temporales suelen resolverse solos',
          'Intenta en horarios de menor tráfico (madrugada)',
          'Prueba con videos diferentes para confirmar el problema'
        ]
      }
    ],
    commonCauses: [
      'YouTube detecta comportamiento automatizado vs humano',
      'Diferencia entre streaming (permitido) y descarga (bloqueada)',
      'Tu navegador tiene cookies/sesión que yt-dlp no puede replicar',
      'Restricciones geográficas más estrictas para descargas',
      'Límites de tasa por IP para herramientas automatizadas',
      'Detección de patrones de request no-humanos'
    ],
    relatedErrors: ['PROXY_BLOCKED', 'NETWORK_ERROR', 'QUOTA_EXCEEDED']
  },
  {
    id: 'video-unavailable',
    title: 'Video No Disponible',
    description: 'El video no se puede acceder o descargar.',
    icon: <AlertTriangle className="w-5 h-5" />,
    severity: 'medium',
    solutions: [
      {
        title: 'Verificar URL y Disponibilidad',
        difficulty: 'easy',
        steps: [
          'Copia la URL directamente desde YouTube',
          'Verifica que el video sea público',
          'Intenta reproducir el video en YouTube',
          'Revisa si el video requiere inicio de sesión'
        ]
      },
      {
        title: 'Probar Formatos Alternativos',
        difficulty: 'medium',
        steps: [
          'Selecciona una calidad de video menor',
          'Intenta descargar solo el audio',
          'Prueba con diferentes formatos (MP4, WebM)',
          'Verifica si hay restricciones de edad'
        ]
      }
    ],
    commonCauses: [
      'Video privado o eliminado',
      'Restricciones de edad',
      'Contenido con derechos de autor',
      'Video en vivo o transmisión'
    ],
    relatedErrors: ['VIDEO_UNAVAILABLE', 'INVALID_URL']
  },
  {
    id: 'network-issues',
    title: 'Problemas de Conexión',
    description: 'Errores relacionados con la conectividad a internet.',
    icon: <Wifi className="w-5 h-5" />,
    severity: 'medium',
    solutions: [
      {
        title: 'Verificar Conectividad',
        difficulty: 'easy',
        steps: [
          'Verifica que tengas conexión a internet',
          'Prueba abrir YouTube en el navegador',
          'Reinicia tu conexión WiFi',
          'Verifica la velocidad de internet'
        ]
      },
      {
        title: 'Optimizar Configuración de Red',
        difficulty: 'medium',
        steps: [
          'Cambia los servidores DNS (8.8.8.8, 1.1.1.1)',
          'Desactiva IPv6 temporalmente',
          'Verifica configuración de proxy',
          'Reinicia el router/módem'
        ]
      }
    ],
    commonCauses: [
      'Conexión inestable',
      'DNS bloqueado',
      'Configuración de proxy',
      'Restricciones del ISP'
    ],
    relatedErrors: ['NETWORK_ERROR', 'TIMEOUT']
  },
  {
    id: 'timeout-issues',
    title: 'Timeouts y Descargas Lentas',
    description: 'Las descargas tardan demasiado o se cancelan por timeout.',
    icon: <Clock className="w-5 h-5" />,
    severity: 'low',
    solutions: [
      {
        title: 'Optimizar Descarga',
        difficulty: 'easy',
        steps: [
          'Selecciona una calidad de video menor',
          'Intenta descargar videos más cortos',
          'Evita descargas durante horas pico',
          'Cierra otras aplicaciones que usen internet'
        ]
      },
      {
        title: 'Configuración Avanzada',
        difficulty: 'advanced',
        steps: [
          'Aumenta el timeout en configuración',
          'Reduce la velocidad de descarga',
          'Usa conexión por cable en lugar de WiFi',
          'Verifica que no haya límites de ancho de banda'
        ]
      }
    ],
    commonCauses: [
      'Conexión lenta',
      'Videos de alta calidad/duración',
      'Congestión de red',
      'Límites del servidor'
    ],
    relatedErrors: ['TIMEOUT', 'NETWORK_ERROR']
  }
];

interface YouTubeTroubleshootingGuideProps {
  currentError?: string;
  onClose?: () => void;
}

export function YouTubeTroubleshootingGuide({ 
  currentError, 
  onClose 
}: YouTubeTroubleshootingGuideProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const toggleSolution = (solutionId: string) => {
    const newExpanded = new Set(expandedSolutions);
    if (newExpanded.has(solutionId)) {
      newExpanded.delete(solutionId);
    } else {
      newExpanded.add(solutionId);
    }
    setExpandedSolutions(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtrar elementos relevantes si hay un error actual
  const relevantItems = currentError 
    ? TROUBLESHOOTING_ITEMS.filter(item => 
        item.relatedErrors.includes(currentError) || 
        item.id === currentError.toLowerCase().replace('_', '-')
      )
    : TROUBLESHOOTING_ITEMS;

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <HelpCircle className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Guía de Solución de Problemas
            </h2>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {currentError && (
          <p className="mt-2 text-sm text-gray-600">
            Mostrando soluciones para: <span className="font-medium">{currentError}</span>
          </p>
        )}
      </div>

      <div className="p-6 space-y-4">
        {relevantItems.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className={getSeverityColor(item.severity)}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.severity === 'high' ? 'bg-red-100 text-red-800' :
                  item.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.severity === 'high' ? 'Alta' : 
                   item.severity === 'medium' ? 'Media' : 'Baja'}
                </span>
                
                {expandedItems.has(item.id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {expandedItems.has(item.id) && (
              <div className="px-4 pb-4 space-y-4">
                {/* Causas Comunes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Causas Comunes:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {item.commonCauses.map((cause, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Soluciones */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Soluciones:
                  </h4>
                  <div className="space-y-2">
                    {item.solutions.map((solution, solutionIndex) => {
                      const solutionId = `${item.id}-solution-${solutionIndex}`;
                      return (
                        <div key={solutionIndex} className="border border-gray-100 rounded">
                          <button
                            onClick={() => toggleSolution(solutionId)}
                            className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                {solution.title}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getDifficultyColor(solution.difficulty)}`}>
                                {solution.difficulty === 'easy' ? 'Fácil' :
                                 solution.difficulty === 'medium' ? 'Medio' : 'Avanzado'}
                              </span>
                            </div>
                            
                            {expandedSolutions.has(solutionId) ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          {expandedSolutions.has(solutionId) && (
                            <div className="px-3 pb-3">
                              <ol className="text-sm text-gray-600 space-y-2">
                                {solution.steps.map((step, stepIndex) => (
                                  <li key={stepIndex} className="flex items-start space-x-2">
                                    <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center justify-center mt-0.5">
                                      {stepIndex + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Enlaces de ayuda adicional */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            ¿Necesitas más ayuda?
          </h4>
          <div className="space-y-2 text-sm">
            <a
              href="https://github.com/yt-dlp/yt-dlp/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-700 hover:text-blue-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Reportar problema en yt-dlp GitHub</span>
            </a>
            <a
              href="https://github.com/yt-dlp/yt-dlp/wiki/FAQ"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-700 hover:text-blue-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>FAQ oficial de yt-dlp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default YouTubeTroubleshootingGuide;