"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, Upload } from 'lucide-react';
import { useApiConfig } from '@/hooks/use-api-config';

export default function TestApiPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDataUri, setVideoDataUri] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const { config } = useApiConfig();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      
      // Convertir a data URI
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setVideoDataUri(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!videoDataUri) {
      setError('Por favor selecciona un video primero');
      return;
    }

    if (!config.isConfigured) {
      setError('Por favor configura tu API key de Gemini primero');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/process-video-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoDataUri,
          apiKey: config.apiKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error procesando el video');
      }

      const result = await response.json();
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Prueba de API de Gemini</h1>
        <p className="text-muted-foreground">
          Prueba directa del endpoint de análisis de videos sin depender de Firebase
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Panel de entrada */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Video
            </CardTitle>
            <CardDescription>
              Selecciona un video corto (máximo 30 segundos) para analizar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="video-file">Archivo de Video</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
              />
            </div>

            {videoFile && (
              <div className="space-y-2">
                <Label>Vista previa:</Label>
                <video 
                  src={videoDataUri} 
                  controls 
                  className="w-full rounded-lg max-h-48"
                />
                <p className="text-sm text-muted-foreground">
                  Archivo: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}

            <Button 
              onClick={handleAnalyze} 
              disabled={!videoDataUri || isProcessing || !config.isConfigured}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Analizar Video
                </>
              )}
            </Button>

            {!config.isConfigured && (
              <Alert>
                <AlertDescription>
                  Necesitas configurar tu API key de Gemini en la configuración principal.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Panel de resultados */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              Escenas detectadas por Gemini
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {results && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Se encontraron {results.scenes?.length || 0} escenas:
                </p>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.scenes?.map((scene: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">Escena {index + 1}</span>
                        <span className="text-sm text-muted-foreground">
                          {scene.startTime} - {scene.endTime}
                        </span>
                      </div>
                      <p className="text-sm">{scene.description}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Label>Respuesta completa (JSON):</Label>
                  <Textarea
                    value={JSON.stringify(results, null, 2)}
                    readOnly
                    className="mt-2 font-mono text-xs"
                    rows={8}
                  />
                </div>
              </div>
            )}

            {!results && !error && !isProcessing && (
              <p className="text-muted-foreground text-center py-8">
                Los resultados aparecerán aquí después del análisis
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}