# Changelog

## [2.1.0] - 2025-01-30

### ✨ Nueva Funcionalidad: Timeline Interactivo con Regeneración Automática de Thumbnails

#### 🎯 Funcionalidades Agregadas
- **Regeneración Automática de Thumbnails**: Los thumbnails se actualizan automáticamente cuando se cambia el tiempo de inicio de una escena arrastrando en el timeline
- **Detección Inteligente de Cambios**: El sistema detecta automáticamente qué escenas cambiaron su `startTime` y regenera solo los thumbnails necesarios
- **Procesamiento Paralelo**: Múltiples thumbnails se regeneran simultáneamente para mejor performance
- **Actualización Visual Inmediata**: Los cambios se reflejan instantáneamente en la interfaz sin intervención manual

#### 🔧 Mejoras Técnicas
- **Path de Video Corregido**: Uso correcto de `originalVideoPath` en lugar de `videoPath` para operaciones FFmpeg
- **Keys Dinámicas**: Implementación de keys únicas en componentes para forzar re-render cuando React no detecta cambios
- **Manejo Robusto de Errores**: Errores individuales en regeneración de thumbnails no afectan otros thumbnails

#### 📁 Archivos Modificados
- `src/app/local-project/[id]/page.tsx` - Lógica de regeneración automática
- `src/components/scene-card.tsx` - Keys únicas y estado mejorado
- `sessions-1.md` - Documentación actualizada
- `LOCAL_MODE.md` - Funcionalidades actualizadas
- `instructions.md` - Patrones arquitectónicos actualizados

#### 🎮 Experiencia de Usuario
- **Flujo Intuitivo**: Arrastra → Cambia → Ve el resultado inmediatamente
- **Sin Pasos Manuales**: No necesitas regenerar thumbnails manualmente
- **Feedback Visual**: Los thumbnails muestran exactamente el frame del nuevo tiempo de inicio

---

## [2.0.0] - 2025-01-29

### 🚀 Modo Local Completo y API BYO de Gemini

#### 🎯 Funcionalidades Principales
- **Modo Local 100%**: Aplicación funciona completamente sin dependencias de Firebase/GCS
- **API BYO de Gemini**: Los usuarios pueden usar su propia API key de Gemini
- **Corrección Crítica de Tiempos**: Parser específico para formato `MM:SS:mmm` de Gemini
- **Timeline Interactivo**: Arrastre de handles con preservación de gaps entre escenas

#### 🔧 Arquitectura
- **Almacenamiento Local**: Sistema basado en JSON para proyectos y metadatos
- **Servidor de Videos Local**: Servir videos desde sistema de archivos local
- **Lazy Loading**: Servicios externos se inicializan solo cuando se necesitan
- **Server Actions Granulares**: Uso correcto de 'use server' a nivel de función

#### 📊 Herramientas de Debug
- `/debug-analysis` - Análisis visual de timing
- `/test-gemini-times` - Testing de parsers de tiempo
- `/debug-times` - Debug de conversiones de tiempo

#### 🎮 Funcionalidades de Usuario
- Subida local de videos
- Análisis con Gemini AI
- Edición de escenas con timeline
- Descarga individual y múltiple de clips
- Estadísticas detalladas de proyecto
- Regeneración de thumbnails
- Sistema de padding global
- Reset a escenas originales

---

## [1.0.0] - 2025-01-28

### 🎬 Versión Inicial
- Integración básica con Firebase y GCS
- Análisis de video con Gemini AI
- Edición básica de escenas
- Descarga de clips