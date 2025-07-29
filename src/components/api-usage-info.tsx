"use client";

import { useApiConfig } from '@/hooks/use-api-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, ExternalLink, Key, Globe, AlertTriangle } from 'lucide-react';

export function ApiUsageInfo() {
  const { config, clearConfig } = useApiConfig();

  const handleRemoveCustomApi = () => {
    if (confirm('¿Estás seguro de que quieres eliminar tu API key personalizada? Se usará la API por defecto.')) {
      clearConfig();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Información de API
        </CardTitle>
        <CardDescription>
          Estado actual de tu configuración de API de Gemini
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.isConfigured ? (
              <>
                <Key className="h-4 w-4 text-green-600" />
                <span className="font-medium">API Personalizada Activa</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="font-medium">API Por Defecto</span>
              </>
            )}
          </div>
          <Badge variant={config.isConfigured ? "default" : "secondary"}>
            {config.isConfigured ? "Personalizada" : "Por Defecto"}
          </Badge>
        </div>

        {config.isConfigured ? (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <Key className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Usando tu API key personalizada
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Todos los análisis de video usarán tu propia API key de Gemini. 
                    Los costos se cargarán directamente a tu cuenta de Google AI.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveCustomApi}
                className="text-red-600 hover:text-red-700"
              >
                Eliminar API Personalizada
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  Gestionar API Keys
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Usando API por defecto
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Para un mejor control y sin límites, configura tu propia API key de Gemini.
                  </p>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                Obtener API Key Gratuita
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> La API de Gemini tiene un nivel gratuito generoso. 
            Consulta los{' '}
            <a 
              href="https://ai.google.dev/pricing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              precios actuales
            </a>
            {' '}para más información.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}