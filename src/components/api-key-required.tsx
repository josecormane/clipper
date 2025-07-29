"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Key, ExternalLink } from 'lucide-react';
import { ApiConfig } from '@/components/api-config';

interface ApiKeyRequiredProps {
  title?: string;
  description?: string;
  showConfigButton?: boolean;
}

export function ApiKeyRequired({ 
  title = "API Key Requerida",
  description = "Para usar esta funcionalidad necesitas configurar tu API key de Gemini.",
  showConfigButton = true 
}: ApiKeyRequiredProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-2">
            <Key className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Configuración necesaria
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Necesitas una API key de Gemini para procesar videos. Es gratuita y fácil de obtener.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {showConfigButton && (
            <div className="flex justify-center">
              <ApiConfig />
            </div>
          )}
          
          <div className="text-center">
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
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            La API de Gemini tiene un nivel gratuito generoso.{' '}
            <a 
              href="https://ai.google.dev/pricing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Ver precios
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}