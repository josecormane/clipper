# Documento de Diseño

## Visión General

La funcionalidad de descarga de videos de YouTube se integrará con el sistema de almacenamiento local existente de la aplicación. Utilizaremos `pytube` como librería única para manejar las descargas, ya que es una solución simple, confiable y específicamente diseñada para YouTube sin dependencias externas complejas.

El sistema seguirá el patrón arquitectónico existente de la aplicación con server actions en Next.js y se integrará directamente con el sistema de proyectos locales.

## Arquitectura

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  • YouTubeDownloadForm (nuevo componente)                  │
│  • DownloadProgress (nuevo componente)                     │
│  • LocalProjectList (componente existente - modificado)    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Server Actions (Next.js)                    │
├─────────────────────────────────────────────────────────────┤
│  • downloadYouTubeVideo() (nueva función)                  │
│  • getVideoInfo() (nueva función)                          │
│  • cancelDownload() (nueva función)                        │
│  • createProjectLocal() (función existente)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                YouTube Download Service                     │
├─────────────────────────────────────────────────────────────┤
│  • PytubeWrapper (nueva clase)                             │
│  • VideoInfoExtractor (nueva clase)                        │
│  • DownloadManager (nueva clase)                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Local Storage System                         │
├─────────────────────────────────────────────────────────────┤
│  • local-storage.ts (sistema existente)                    │
│  • local-actions.ts (sistema existente)                    │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

1. **Entrada de URL**: Usuario proporciona URL de YouTube
2. **Validación**: Verificar que la URL es válida y el video está disponible
3. **Extracción de Información**: Obtener metadatos del video (título, duración, formatos disponibles)
4. **Selección de Calidad**: Usuario selecciona calidad deseada
5. **Descarga**: Descargar video con progreso en tiempo real
6. **Almacenamiento**: Guardar en local-storage/videos/
7. **Creación de Proyecto**: Crear proyecto local automáticamente
8. **Integración**: Video disponible para análisis inmediato

## Componentes y Interfaces

### 1. PytubeWrapper

```typescript
interface VideoFormat {
  itag: number;
  mime_type: string;
  resolution: string;
  filesize?: number;
  video_codec: string;
  audio_codec: string;
}

interface VideoInfo {
  video_id: string;
  title: string;
  length: number;
  thumbnail_url: string;
  author: string;
  publish_date: string;
  streams: VideoFormat[];
}

interface DownloadProgress {
  status: 'downloading' | 'processing' | 'complete' | 'error';
  bytes_downloaded?: number;
  total_bytes?: number;
  percentage?: number;
}

class PytubeWrapper {
  static async getVideoInfo(url: string): Promise<VideoInfo>;
  static async downloadVideo(
    url: string, 
    outputPath: string, 
    options: DownloadOptions,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string>;
  static async cancelDownload(processId: string): Promise<void>;
}
```

### 2. DownloadManager

```typescript
interface DownloadSession {
  id: string;
  url: string;
  status: 'pending' | 'downloading' | 'complete' | 'cancelled' | 'error';
  progress: DownloadProgress;
  outputPath?: string;
  projectId?: string;
  error?: string;
}

class DownloadManager {
  private activeSessions: Map<string, DownloadSession>;
  
  async startDownload(url: string, options: DownloadOptions): Promise<string>;
  async cancelDownload(sessionId: string): Promise<void>;
  getDownloadStatus(sessionId: string): DownloadSession | null;
  getAllActiveSessions(): DownloadSession[];
}
```

### 3. Componentes React

```typescript
// YouTubeDownloadForm.tsx
interface YouTubeDownloadFormProps {
  onDownloadStart: (sessionId: string) => void;
}

// DownloadProgress.tsx
interface DownloadProgressProps {
  sessionId: string;
  onComplete: (projectId: string) => void;
  onCancel: () => void;
}
```

## Modelos de Datos

### Extensión del Modelo Project

```typescript
interface Project {
  // ... campos existentes
  source?: 'upload' | 'youtube';
  sourceUrl?: string; // URL original de YouTube
  youtubeMetadata?: {
    videoId: string;
    uploader: string;
    uploadDate: string;
    originalTitle: string;
  };
}
```

### Configuración de Descarga

```typescript
interface DownloadOptions {
  format?: string; // 'best', 'worst', o format_id específico
  quality?: 'highest' | 'high' | 'medium' | 'low';
  maxFileSize?: number; // en bytes
  audioOnly?: boolean;
  subtitles?: boolean;
}
```

## Manejo de Errores

### Estrategias de Recuperación

1. **Bloqueos de Proxy**:
   - Usar múltiples user agents rotativos
   - Implementar delays aleatorios entre requests
   - Utilizar extractors alternativos de pytube

2. **Errores de Red**:
   - Reintentos automáticos con backoff exponencial
   - Timeout configurable
   - Detección de conexión perdida

3. **Restricciones de YouTube**:
   - Detección de videos privados/eliminados
   - Manejo de restricciones geográficas
   - Validación de edad

### Códigos de Error

```typescript
enum DownloadErrorCode {
  INVALID_URL = 'INVALID_URL',
  VIDEO_UNAVAILABLE = 'VIDEO_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PROXY_BLOCKED = 'PROXY_BLOCKED',
  INSUFFICIENT_SPACE = 'INSUFFICIENT_SPACE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  CANCELLED_BY_USER = 'CANCELLED_BY_USER'
}
```

## Estrategia de Testing

### Tests Unitarios

1. **PytubeWrapper Tests**:
   - Validación de URLs
   - Extracción de información de video
   - Manejo de errores de pytube

2. **DownloadManager Tests**:
   - Gestión de sesiones concurrentes
   - Cancelación de descargas
   - Limpieza de archivos temporales

3. **Integration Tests**:
   - Flujo completo de descarga
   - Integración con sistema de almacenamiento local
   - Creación automática de proyectos

### Tests de Componentes

1. **YouTubeDownloadForm**:
   - Validación de formulario
   - Manejo de estados de carga
   - Integración con server actions

2. **DownloadProgress**:
   - Actualización de progreso en tiempo real
   - Funcionalidad de cancelación
   - Transiciones de estado

## Consideraciones de Implementación

### Dependencias Requeridas

```json
{
  "dependencies": {
    "pytube": "^15.0.0" // Librería de Python para YouTube
  }
}
```

### Configuración del Sistema

1. **Instalación de pytube**:
   - Verificación automática de instalación de Python
   - Instalación automática de pytube via pip
   - Configuración de entorno Python

2. **Configuración de Paths**:
   - Directorio temporal para descargas
   - Directorio final en local-storage/videos/
   - Limpieza automática de archivos temporales

### Optimizaciones de Rendimiento

1. **Descargas Concurrentes**:
   - Límite máximo de descargas simultáneas (2-3)
   - Cola de descargas pendientes
   - Priorización por tamaño de archivo

2. **Gestión de Memoria**:
   - Streaming de archivos grandes
   - Limpieza de buffers temporales
   - Monitoreo de uso de disco

### Seguridad

1. **Validación de URLs**:
   - Whitelist de dominios permitidos (youtube.com, youtu.be)
   - Sanitización de nombres de archivo
   - Prevención de path traversal

2. **Límites de Recursos**:
   - Tamaño máximo de archivo (configurable)
   - Timeout de descarga
   - Límite de descargas por usuario/sesión

## Integración con Sistema Existente

### Modificaciones Requeridas

1. **local-storage.ts**:
   - Extensión del modelo Project
   - Nuevos métodos para metadatos de YouTube

2. **local-actions.ts**:
   - Nuevas server actions para descarga
   - Integración con createProjectLocal existente

3. **Componentes UI**:
   - Modificación de LocalFileUploader para incluir opción de YouTube
   - Actualización de ProjectList para mostrar fuente del video

### Flujo de Usuario Actualizado

1. **Página Local** (`/local`):
   - Tabs: "Subir Archivo" | "Descargar de YouTube"
   - Formulario de URL de YouTube
   - Lista de descargas activas

2. **Proceso de Descarga**:
   - Validación de URL → Extracción de info → Selección de calidad → Descarga → Creación de proyecto

3. **Integración con Análisis**:
   - Video descargado disponible inmediatamente para análisis
   - Metadatos de YouTube incluidos en el proyecto