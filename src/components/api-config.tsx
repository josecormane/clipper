"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ApiStatusIndicator } from '@/components/api-status-indicator';

interface ApiConfigData {
    apiKey: string;
    isConfigured: boolean;
}

export function ApiConfig() {
    const [config, setConfig] = useState<ApiConfigData>({ apiKey: '', isConfigured: false });
    const [isOpen, setIsOpen] = useState(false);
    const [tempApiKey, setTempApiKey] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Cargar configuración guardada
        const savedConfig = localStorage.getItem('gemini-api-config');
        if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            setConfig(parsed);
            setTempApiKey(parsed.apiKey);
        }
    }, []);

    const validateApiKey = async (apiKey: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/validate-gemini-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey }),
            });

            return response.ok;
        } catch (error) {
            console.error('Error validating API key:', error);
            return false;
        }
    };

    const handleSave = async () => {
        if (!tempApiKey.trim()) {
            toast({
                title: "Error",
                description: "Por favor ingresa una API key válida",
                variant: "destructive",
            });
            return;
        }

        setIsValidating(true);

        const isValid = await validateApiKey(tempApiKey);

        if (isValid) {
            const newConfig = { apiKey: tempApiKey, isConfigured: true };
            setConfig(newConfig);
            localStorage.setItem('gemini-api-config', JSON.stringify(newConfig));
            setIsOpen(false);

            toast({
                title: "Configuración guardada",
                description: "Tu API key de Gemini ha sido configurada correctamente",
            });
        } else {
            toast({
                title: "API key inválida",
                description: "La API key proporcionada no es válida. Verifica que sea correcta.",
                variant: "destructive",
            });
        }

        setIsValidating(false);
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) {
            setTempApiKey(config.apiKey);
        }
    };

    const maskApiKey = (key: string) => {
        if (key.length <= 8) return key;
        return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
    };

    return (
        <div className="flex items-center gap-3">
            <ApiStatusIndicator />

            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Configurar API
                    </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Configuración de API Gemini
                        </DialogTitle>
                        <DialogDescription>
                            Configura tu propia API key de Gemini para el análisis de videos
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {config.isConfigured && (
                            <div className="space-y-2">
                                <Label>API Key actual:</Label>
                                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                                    <Key className="h-4 w-4 text-muted-foreground" />
                                    <code className="text-sm">
                                        {maskApiKey(config.apiKey)}
                                    </code>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="api-key">
                                {config.isConfigured ? 'Nueva API Key' : 'API Key de Gemini'}
                            </Label>
                            <Input
                                id="api-key"
                                type="password"
                                placeholder="Ingresa tu API key de Gemini..."
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                disabled={isValidating}
                            />
                            <p className="text-xs text-muted-foreground">
                                Puedes obtener tu API key en{' '}
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    Google AI Studio
                                </a>
                            </p>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button
                                onClick={handleSave}
                                disabled={isValidating || !tempApiKey.trim()}
                                className="flex-1"
                            >
                                {isValidating ? 'Validando...' : 'Guardar'}
                            </Button>
                            <Button
                                onClick={() => setIsOpen(false)}
                                variant="outline"
                                disabled={isValidating}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}