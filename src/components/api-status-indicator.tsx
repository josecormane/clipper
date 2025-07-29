"use client";

import { useApiConfig } from '@/hooks/use-api-config';
import { Badge } from '@/components/ui/badge';
import { Key, Globe, AlertTriangle } from 'lucide-react';

export function ApiStatusIndicator() {
  const { config, isLoading } = useApiConfig();

  if (isLoading) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        Cargando...
      </Badge>
    );
  }

  // Verificar si hay una API key válida por defecto
  const hasValidDefaultKey = process.env.NEXT_PUBLIC_HAS_DEFAULT_API === 'true';

  if (config.isConfigured) {
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <Key className="w-3 h-3" />
        API Personalizada
      </Badge>
    );
  }

  if (hasValidDefaultKey) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Globe className="w-3 h-3" />
        API Por Defecto
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="flex items-center gap-1">
      <AlertTriangle className="w-3 h-3" />
      API Requerida
    </Badge>
  );
}