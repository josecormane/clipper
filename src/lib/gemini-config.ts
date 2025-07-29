import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Función para verificar si una API key es válida (no es un placeholder)
function isValidApiKey(apiKey: string): boolean {
  return apiKey && 
         apiKey !== 'your-gemini-api-key-here' && 
         apiKey !== 'demo-api-key' &&
         apiKey.length > 10 &&
         !apiKey.includes('placeholder');
}

// Función para crear una instancia de AI con una API key específica
export function createGeminiInstance(apiKey?: string) {
  const providedKey = apiKey || process.env.GOOGLE_GENAI_API_KEY;
  
  if (!providedKey || !isValidApiKey(providedKey)) {
    throw new Error('No valid Gemini API key provided. Please configure your API key in the settings.');
  }

  return genkit({
    plugins: [
      googleAI({
        apiKey: providedKey,
      })
    ],
    model: 'googleai/gemini-2.5-flash',
  });
}

// Variable para almacenar la instancia lazy
let _defaultAiInstance: any = null;

// Función para verificar si hay una API key válida configurada
export function hasValidDefaultApiKey(): boolean {
  const envKey = process.env.GOOGLE_GENAI_API_KEY;
  return envKey ? isValidApiKey(envKey) : false;
}

// Getter para la instancia por defecto (lazy loading)
export function getDefaultAiInstance() {
  if (!_defaultAiInstance) {
    _defaultAiInstance = createGeminiInstance();
  }
  return _defaultAiInstance;
}

// Función segura que no lanza errores al inicializar
export function tryGetDefaultAiInstance() {
  try {
    return getDefaultAiInstance();
  } catch (error) {
    console.warn('No valid default API key configured:', error);
    return null;
  }
}

// Export para compatibilidad con el código existente
export const ai = new Proxy({} as any, {
  get(target, prop) {
    const instance = tryGetDefaultAiInstance();
    if (!instance) {
      throw new Error('No valid Gemini API key configured. Please set up your API key in the settings.');
    }
    return instance[prop];
  }
});