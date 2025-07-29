"use client";

import { Logo } from '@/components/logo';
import { ApiConfig } from '@/components/api-config';
import { ApiUsageInfo } from '@/components/api-usage-info';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Configuración</h1>
        </div>
        <Logo />
      </header>

      <main className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Configuración de API</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <ApiConfig />
            </div>
            <ApiUsageInfo />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Información Adicional</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">¿Por qué usar tu propia API?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Control total sobre los costos</li>
                <li>• Sin límites de uso</li>
                <li>• Mejor rendimiento</li>
                <li>• Privacidad de datos</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">Recursos Útiles</h3>
              <div className="space-y-2 text-sm">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-blue-500 hover:underline"
                >
                  → Obtener API Key gratuita
                </a>
                <a 
                  href="https://ai.google.dev/pricing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-blue-500 hover:underline"
                >
                  → Ver precios de Gemini API
                </a>
                <a 
                  href="https://ai.google.dev/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block text-blue-500 hover:underline"
                >
                  → Documentación oficial
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}