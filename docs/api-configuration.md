# Configuración de API Personalizada de Gemini

Esta aplicación ahora soporta el uso de tu propia API key de Gemini para el análisis de videos, lo que te da control total sobre los costos y el rendimiento.

## ¿Por qué usar tu propia API key?

- **Control de costos**: Los gastos se cargan directamente a tu cuenta de Google AI
- **Sin límites**: No hay restricciones de uso más allá de las de Google
- **Mejor rendimiento**: Acceso directo a la API sin intermediarios
- **Privacidad**: Tus datos van directamente a Google, no a través de servicios terceros

## Cómo configurar tu API key

### 1. Obtener una API key de Gemini

1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key"
4. Copia la API key generada

### 2. Configurar en la aplicación

1. En la página principal, haz clic en "Configurar API" en la esquina superior derecha
2. Pega tu API key en el campo correspondiente
3. Haz clic en "Guardar" - la aplicación validará automáticamente la key
4. Una vez configurada, verás el indicador "API Personalizada" en verde

### 3. Gestionar tu configuración

- Ve a **Configuración** para ver el estado completo de tu API
- Puedes cambiar o eliminar tu API key en cualquier momento
- El indicador de estado te muestra si estás usando tu API personalizada o la por defecto

## Uso en el código

### Hook personalizado

```typescript
import { useVideoProcessor } from '@/hooks/use-video-processor';

function MyComponent() {
  const { 
    processVideoChunks, 
    isProcessing, 
    progress, 
    usingCustomApi 
  } = useVideoProcessor();

  // El hook automáticamente usa la API configurada
  const handleProcess = async (chunks) => {
    const results = await processVideoChunks(chunks);
    console.log('Resultados:', results);
  };
}
```

### API directa

```typescript
import { createVideoProcessor } from '@/lib/video-processing';

// Con API key personalizada
const processor = createVideoProcessor('tu-api-key-aqui');

// Sin API key (usa la por defecto)
const processor = createVideoProcessor();

const result = await processor.processVideoChunk({
  videoDataUri: 'data:video/mp4;base64,...'
});
```

### Endpoint HTTP

```javascript
const response = await fetch('/api/process-video-chunk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoDataUri: 'data:video/mp4;base64,...',
    apiKey: 'tu-api-key-opcional' // Si no se proporciona, usa la por defecto
  })
});
```

## Precios de Gemini API

La API de Gemini tiene un nivel gratuito muy generoso:

- **Gemini 1.5 Flash**: Hasta 15 RPM (requests per minute) gratis
- **Gemini 1.5 Pro**: Hasta 2 RPM gratis
- **Límites diarios**: Hasta 1,500 requests por día gratis

Para más información sobre precios, consulta: https://ai.google.dev/pricing

## Seguridad

- Las API keys se almacenan localmente en tu navegador (localStorage)
- No se envían a ningún servidor externo excepto directamente a Google
- Puedes eliminar tu API key en cualquier momento desde la configuración

## Solución de problemas

### Error: "Invalid API key"
- Verifica que hayas copiado la API key completa
- Asegúrate de que la API key esté activa en Google AI Studio
- Revisa que no haya espacios adicionales al inicio o final

### Error: "API key not configured"
- Ve a Configuración y verifica que tu API key esté guardada
- Si el problema persiste, elimina y vuelve a configurar la API key

### Rendimiento lento
- Si usas la API por defecto, considera configurar tu propia API key
- Para videos largos, usa el procesamiento en paralelo con precaución (puede consumir más cuota)

## Migración desde la API por defecto

Si ya tienes proyectos procesados con la API por defecto, no necesitas hacer nada. La nueva configuración solo afecta a los procesamientos futuros. Todos los datos existentes permanecen intactos.