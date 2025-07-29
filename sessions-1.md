# Sesiones de Desarrollo - Registro Histórico

## Sesión 1: Implementación de API BYO de Gemini y Modo Local Completo

### Objetivos Principales
- **Objetivo Primario**: Implementar capacidad de integrar API BYO (Bring Your Own) de Gemini para análisis de videos, disponible y operable a través de la interfaz de usuario
- **Objetivo Evolutivo**: Resolver errores surgidos durante implementación (configuración API, Server Actions, generación thumbnails)
- **Objetivo Crítico**: Corregir interpretación incorrecta de tiempos de escenas devueltos por Gemini
- **Objetivo Final**: Crear versión completamente local sin dependencias de Firebase

### Hallazgos Críticos

#### 1. Problema de Carga de Credenciales Genkit
**Descubrimiento**: La instancia `ai` de Genkit se creaba por defecto al importar el módulo, causando fallos si no había API key válida configurada.
**Momento 'Ajá'**: El error "Could not load the default credentials" ocurría incluso con la nueva API BYO implementada porque la instancia se inicializaba antes de que el usuario pudiera configurar su key.

#### 2. Incompatibilidad Proxy con Server Actions
**Descubrimiento**: El uso de Proxy para flows de Genkit (`processVideoChunkFlow`) no era compatible con Server Actions de Next.js.
**Momento 'Ajá'**: Los Proxies no serializan correctamente para Server Actions, requiriendo funciones directas exportables.

#### 3. Uso Incorrecto de 'use server'
**Descubrimiento**: Colocar `'use server'` al inicio de archivos con múltiples exports hacía que Next.js tratara todos los exports como Server Actions.
**Momento 'Ajá'**: La granularidad de `'use server'` debe ser a nivel de función específica, no archivo completo.

#### 4. Interpretación Errónea de Tiempos de Gemini (CRÍTICO)
**Descubrimiento**: Gemini devolvía tiempos en formato `MM:SS:mmm` (Minutos:Segundos:Milisegundos), pero el parser los interpretaba como `HH:MM:SS` (Horas:Minutos:Segundos).
**Momento 'Ajá'**: `00:00:999` significaba 0.999 segundos, no 999 segundos (16:39). Este error fundamental hacía que todas las escenas tuvieran duraciones ilógicas.

#### 5. Dependencia de Backend Firebase/GCS
**Descubrimiento**: Los errores de configuración de backend eran independientes de la API de Gemini y requerían solución arquitectónica diferente.
**Momento 'Ajá'**: Un modo completamente local eliminaría estas dependencias y simplificaría el desarrollo.

### Soluciones Implementadas

#### Fase 1: Implementación Inicial BYO API
- **Componentes UI**: `ApiConfig`, `ApiStatusIndicator`, `ApiKeyRequired`, `ApiUsageInfo`
- **Configuración Dinámica**: `gemini-config.ts` con lazy loading
- **Hooks Personalizados**: `useApiConfig`, `useVideoProcessor`
- **Rutas API**: `/api/validate-gemini-key`, `/api/process-video-chunk`

#### Fase 2: Resolución de Errores de Credenciales
- **Lazy Loading**: Instancia `ai` se crea solo cuando se necesita
- **Validación Robusta**: Funciones `tryGetDefaultAiInstance`, `hasValidDefaultApiKey`
- **UI Informativa**: Indicadores claros de estado de API y mensajes de error

#### Fase 3: Corrección de Server Actions
- **Eliminación de Proxies**: Reemplazados con funciones directas exportables
- **Uso Granular de 'use server'**: Aplicado solo a funciones específicas
- **Refactorización de Flows**: `processVideoChunkWithCustomApiFlow` como función directa

#### Fase 4: Implementación de Modo Local
- **Almacenamiento Local**: `local-storage.ts` reemplazando Firestore con JSON
- **Acciones Locales**: `local-actions.ts` para operaciones CRUD locales
- **Componentes Locales**: `LocalFileUploader`, `LocalProjectList`
- **Rutas Locales**: `/api/videos/[filename]`, `/api/upload-video`

#### Fase 5: Corrección Crítica de Tiempos
- **Parser Específico**: Función `timeStringToSeconds` para formato `MM:SS:mmm` de Gemini
- **Logs Detallados**: Seguimiento paso a paso de conversiones de tiempo
- **Prompt Mejorado**: Instrucciones explícitas a Gemini sobre formato de tiempo
- **Herramientas Debug**: Páginas `/debug-analysis`, `/test-gemini-times`

### Archivos Creados/Modificados

#### Configuración Core
- `src/lib/gemini-config.ts` - Gestión dinámica de configuración Gemini
- `src/ai/genkit.ts` - Re-export centralizado
- `src/ai/flows/generate-video-description-custom.ts` - Flow con API personalizada

#### Componentes UI
- `src/components/api-config.tsx` - Configuración de API en interfaz
- `src/components/api-status-indicator.tsx` - Indicador visual de estado
- `src/components/api-key-required.tsx` - Mensaje cuando se requiere configuración
- `src/components/thumbnail-image.tsx` - Manejo robusto de thumbnails
- `src/components/analysis-progress.tsx` - Progreso de análisis en tiempo real
- `src/components/project-stats.tsx` - Estadísticas detalladas de proyecto

#### Sistema Local
- `src/lib/local-storage.ts` - Base de datos JSON local
- `src/lib/local-actions.ts` - Server actions para modo local
- `src/components/local-file-uploader.tsx` - Subida de archivos local
- `src/components/local-project-list.tsx` - Lista de proyectos locales
- `src/app/local/page.tsx` - Página principal modo local
- `src/app/local-project/[id]/page.tsx` - Vista de proyecto local

#### Herramientas Debug
- `src/app/debug-analysis/page.tsx` - Análisis visual de timing
- `src/app/test-gemini-times/page.tsx` - Test de parser de tiempos
- `src/app/debug-times/page.tsx` - Debug de conversiones de tiempo

#### Documentación
- `docs/api-configuration.md` - Guía completa de configuración API
- `LOCAL_MODE.md` - Documentación exhaustiva del modo local

### Resultados Medibles
- **Funcionalidad Completa**: API BYO de Gemini operativa en interfaz
- **Modo Local 100%**: Aplicación funciona sin dependencias de Firebase/GCS
- **Corrección de Tiempos**: Parser específico para formato `MM:SS:mmm` de Gemini
- **Manejo Robusto de Errores**: Thumbnails fallan silenciosamente sin romper análisis
- **Herramientas Debug**: 3 páginas especializadas para diagnóstico
- **Documentación Completa**: Guías detalladas para usuarios y desarrolladores

### Lecciones/Patrones Críticos Establecidos

#### Patrón: Lazy Loading de Servicios Externos
**Establecido**: No inicializar servicios externos (como Genkit) al importar módulos. Usar lazy loading con validación en tiempo de ejecución.
**Razón**: Evita errores de credenciales y permite configuración dinámica por usuario.

#### Patrón: Granularidad de 'use server'
**Establecido**: Aplicar `'use server'` a nivel de función específica, no archivo completo.
**Razón**: Evita que Next.js trate exports no-Server-Action como Server Actions.

#### Patrón: Parser Específico para APIs Externas
**Establecido**: Crear parsers específicos para formatos de datos de APIs externas, no asumir formatos estándar.
**Razón**: APIs como Gemini pueden usar formatos no estándar (`MM:SS:mmm` vs `HH:MM:SS`).

#### Patrón: Modo Local como Alternativa Arquitectónica
**Establecido**: Implementar modo local completo como alternativa a dependencias de cloud.
**Razón**: Simplifica desarrollo, testing y ofrece privacidad total al usuario.

#### Patrón: Logs Detallados con Emojis para Debug
**Establecido**: Usar logs estructurados con emojis y summaries para diagnóstico complejo.
**Razón**: Facilita identificación de problemas en flujos multi-paso como análisis de video.

#### Patrón: Herramientas Debug Dedicadas
**Establecido**: Crear páginas especializadas de debug para problemas complejos.
**Razón**: Permite diagnóstico visual y testing de componentes específicos.

#### Patrón: Manejo Resiliente de Errores
**Establecido**: Errores no críticos (como thumbnails) deben fallar silenciosamente con fallbacks elegantes.
**Razón**: Mantiene funcionalidad principal operativa incluso con problemas secundarios.

### Estado Final
**Aplicación Completamente Funcional** en modo local con API BYO de Gemini integrada. Permite subida local de videos, análisis con Gemini, edición de escenas, descarga de clips, estadísticas detalladas y progreso en tiempo real.

**Problemas Pendientes**: Errores persistentes de FFmpeg (code 234) para generación de thumbnails, aunque manejados elegantemente con placeholders.