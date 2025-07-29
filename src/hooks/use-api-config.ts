"use client";

import { useState, useEffect } from 'react';

interface ApiConfig {
  apiKey: string;
  isConfigured: boolean;
}

export function useApiConfig() {
  const [config, setConfig] = useState<ApiConfig>({ apiKey: '', isConfigured: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Cargar configuración desde localStorage
    const loadConfig = () => {
      try {
        const savedConfig = localStorage.getItem('gemini-api-config');
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig);
          setConfig(parsed);
        }
      } catch (error) {
        console.error('Error loading API config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const updateConfig = (newConfig: ApiConfig) => {
    setConfig(newConfig);
    localStorage.setItem('gemini-api-config', JSON.stringify(newConfig));
  };

  const clearConfig = () => {
    setConfig({ apiKey: '', isConfigured: false });
    localStorage.removeItem('gemini-api-config');
  };

  return {
    config,
    isLoading,
    updateConfig,
    clearConfig,
  };
}