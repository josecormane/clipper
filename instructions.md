# Instructions - Arquitectura Vigente y Guía de Reconstrucción

## Tech Stack Decisions

### Core Framework
- **Next.js 15** con Turbopack para desarrollo
- **TypeScript** para type safety
- **Tailwind CSS** + **shadcn/ui** para UI components
- **Genkit** para integración con Gemini AI

### Arquitectura de Almacenamiento Dual
**Decisión Crítica**: Implementar dos modos de operación completamente independientes:

1. **Modo Cloud** (Original)
   - Firebase Firestore para base de datos
   - Google Cloud Storage para videos
   - Firebase Auth para autenticación

2. **Modo Local** (Implementado)
   - JSON files para base de datos (`local-storage/projects.json`)
   - Sistema de archivos local para videos
   - Sin autenticación

**Razón**: Eliminar dependencias de configuración compleja de cloud services para desarrollo y testing.

### AI Integration Pattern
**Patrón Establecido**: BYO (Bring Your Own) API Key
- Usuario proporciona su propia API key de Gemini
- Configuración dinámica sin hardcoding
- Lazy loading de servicios AI
- Fallback elegante cuando no hay configuración

## Patrones Arquitectónicos Fundamentales

### Patrón: Lazy Loading de Servicios Externos
**Regla**: NUNCA inicializar servicios externos (Genkit, APIs) al importar módulos.
```typescript
// ❌ MAL - Se ejecuta al importar
export const ai = genkit({ plugins: [googleAI()] });

// ✅ BIEN - Se ejecuta cuando se necesita
export function getAiInstance() {
  if (!_instance) {
    _instance = genkit({ plugins: [googleAI()] });
  }
  return _instance;
}
```

### Patrón: Server Actions Granulares
**Regla**: Aplicar `'use server'` a nivel de función específica, NO a nivel de archivo.
```typescript
// ❌ MAL - Afecta todo el archivo
'use server';
export const func1 = () => {};
export const func2 = () => {};

// ✅ BIEN - Solo funciones específicas
export async function serverAction() {
  'use server';
  // lógica
}
```

### Patrón: Parser Específico para APIs Externas
**Regla**: Crear parsers específicos para formatos de datos de APIs externas, no asumir formatos estándar.
```typescript
// Gemini usa MM:SS:mmm, no HH:MM:SS
function parseGeminiTime(time: string): number {
  const [minutes, seconds, milliseconds] = time.split(':').map(Number);
  return minutes * 60 + seconds + milliseconds / 1000;
}
```

### Patrón: Dual Mode Architecture
**Regla**: Componentes deben ser agnósticos al backend. Usar abstracciones para alternar entre modos.
```typescript
// Abstracción de acciones
interface ProjectActions {
  getAllProjects(): Promise<Project[]>;
  createProject(data: CreateProjectData): Promise<string>;
  // ...
}

// Implementaciones específicas
class LocalProjectActions implements ProjectActions { /* ... */ }
class CloudProjectActions implements ProjectActions { /* ... */ }
```

## Metodologías de Debugging Establecidas

### Debug con Logs Estructurados
**Metodología**: Usar logs con emojis y estructura clara para flujos complejos.
```typescript
console.log('🎬 ANALYZING CHUNK 1');
console.log('📍 Chunk starts at: 0s');
console.log('🤖 GEMINI RESPONSE:', JSON.stringify(result, null, 2));
console.log('✅ Found 18 scenes');
```

### Páginas de Debug Dedicadas
**Metodología**: Crear páginas especializadas para debugging de problemas complejos:
- `/debug-analysis` - Análisis visual de timing issues
- `/test-gemini-times` - Testing de parsers de tiempo
- `/debug-times` - Debug de conversiones de tiempo

### Herramientas de Desarrollo Condicionales
**Metodología**: Exponer herramientas de debug solo en desarrollo.
```typescript
{process.env.NODE_ENV === 'development' && (
  <Link href="/debug-analysis">Debug Tools</Link>
)}
```

## Filosofías de Diseño de Sistema

### Filosofía: Resilient Error Handling
**Principio**: Errores no críticos deben fallar silenciosamente con fallbacks elegantes.
- Thumbnails que fallan → Placeholder con icono
- Timeline drag → Regeneración automática de thumbnails
- APIs no disponibles → Mensajes informativos
- Configuración faltante → Guías de configuración

### Filosofía: User-Centric Configuration
**Principio**: Usuario debe tener control total sobre sus datos y configuración.
- API keys propias (no compartidas)
- Modo local para privacidad total
- Configuración persistente en localStorage
- Validación en tiempo real

### Filosofía: Progressive Enhancement
**Principio**: Funcionalidad básica debe funcionar sin configuración compleja.
- Modo local funciona sin setup de cloud
- API validation antes de procesamiento
- Fallbacks para todas las dependencias externas

## Reglas de Comportamiento para Desarrollo con IA

### Regla: LLM-First Decision Making
**Establecido**: Confiar en inteligencia contextual del LLM vs algoritmos primitivos para decisiones semánticas.
- Gemini analiza contenido de video (no reglas hardcoded)
- Descripciones generadas por AI (no templates)
- Detección de escenas basada en contenido visual

### Regla: Validation Before Processing
**Establecido**: Validar configuración y recursos antes de operaciones costosas.
```typescript
// Validar API key antes de análisis
if (!config.isConfigured) {
  throw new Error('API key required');
}

// Validar archivo antes de procesamiento
if (!fs.existsSync(videoPath)) {
  throw new Error('Video file not found');
}
```

### Regla: Graceful Degradation
**Establecido**: Sistema debe funcionar parcialmente incluso con fallos de componentes.
- Análisis continúa sin thumbnails
- UI funciona sin API configurada (con mensajes)
- Modo local independiente de modo cloud

### Regla: Automatic Asset Regeneration
**Establecido**: Assets dependientes (thumbnails) deben regenerarse automáticamente cuando cambian sus dependencias (startTime).
- Timeline drag → Detección automática de cambios en startTime
- Regeneración paralela de thumbnails afectados
- Actualización visual inmediata sin intervención manual
- Preservación de gaps entre escenas durante edición

## Patrones de Migración y Compatibilidad

### Patrón: Backward Compatible Data Structures
**Regla**: Nuevos campos deben ser opcionales y tener defaults sensatos.
```typescript
interface Project {
  // Campos existentes
  id: string;
  name: string;
  // Nuevos campos opcionales
  analysisError?: string;
  thumbnail?: string;
}
```

### Patrón: Environment-Specific Behavior
**Regla**: Comportamiento debe adaptarse al entorno sin configuración manual.
```typescript
// Auto-detectar capacidades del entorno
const hasFFmpeg = await checkFFmpegAvailable();
const canGenerateThumbnails = hasFFmpeg && !isProduction;
```

## Arquitectura de Componentes

### Principio: Separation of Concerns
- **UI Components**: Solo presentación y interacción
- **Hooks**: Lógica de estado y efectos
- **Actions**: Operaciones de servidor
- **Utils**: Funciones puras de transformación

### Principio: Composition over Inheritance
```typescript
// Componer funcionalidad específica
<VideoAnalyzer>
  <ApiConfig />
  <ProgressIndicator />
  <ResultsDisplay />
</VideoAnalyzer>
```

### Principio: Error Boundaries
Cada sección crítica debe tener manejo de errores:
- API configuration errors
- Video processing errors  
- File system errors
- Network errors

## Deployment Considerations

### Local Development
- Modo local debe funcionar sin configuración externa
- FFmpeg debe estar disponible en PATH
- Permisos de escritura en directorio local-storage

### Production Deployment
- Variables de entorno para API keys por defecto
- Configuración de CORS para subida directa
- Manejo de archivos grandes (streaming)
- Rate limiting para APIs externas