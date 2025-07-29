# UI/UX Guidelines - Sistema de Diseño

## Principios de Diseño Visual

### Principio: Indicadores de Estado con Iconografía Consistente
**Establecido**: Usar iconografía específica para estados de API y configuración:
- `Key` icon para API personalizada configurada
- `Globe` icon para API por defecto
- `AlertTriangle` icon para API requerida/error
- `Database` icon para modo local
- Colores: Verde para configurado, Amarillo para advertencia, Rojo para error

### Principio: Thumbnails Robustos con Fallback Elegante
**Establecido**: Componente `ThumbnailImage` con manejo de errores:
- Placeholder con `FileVideo` icon cuando falla la carga
- Animación de loading con pulse
- Dimensiones fijas para consistencia visual
- `unoptimized` para data URIs

### Principio: Progreso Visual con Contexto Detallado
**Establecido**: Componente `AnalysisProgress` debe incluir:
- Barra de progreso principal
- Progreso de chunks individuales cuando aplique
- Estadísticas de tiempo transcurrido
- Información contextual sobre el proceso
- Tips y mensajes informativos para el usuario

### Principio: Debug UI con Emojis y Estructura Clara
**Establecido**: Páginas de debug deben usar:
- Emojis para categorización visual (🎬, 📍, 🤖, ✅, ❌)
- Cards separadas para diferentes tipos de información
- ScrollArea para contenido extenso
- Badges para estados y resultados
- Código monospace para datos técnicos

## Patrones de Interacción

### Patrón: Configuración Modal con Validación en Tiempo Real
**Establecido**: Configuración de API debe:
- Usar Dialog para configuración no intrusiva
- Validar API key antes de guardar
- Mostrar estado de validación con loading
- Enmascarar API keys existentes
- Proporcionar enlaces directos a obtención de keys

### Patrón: Modo Local con Identificación Visual Clara
**Establecido**: Modo local debe tener:
- Badge distintivo con `Database` icon y color verde
- Indicación clara en headers y navegación
- Diferenciación visual del modo cloud
- Enlaces de navegación entre modos

### Patrón: Estadísticas de Proyecto con Grid Responsivo
**Establecido**: `ProjectStats` debe usar:
- Grid responsivo (2 cols en mobile, 4 en desktop)
- Iconografía consistente para métricas
- ScrollArea para listas extensas de escenas
- Hover states para interactividad
- Formato monospace para tiempos precisos

## Componentes Base

### ThumbnailImage
```tsx
// Manejo robusto de errores con placeholder elegante
<ThumbnailImage
  src={thumbnailUrl}
  alt="Scene thumbnail"
  width={160}
  height={90}
  className="w-full h-full"
/>
```

### ApiStatusIndicator
```tsx
// Indicador visual consistente de estado de API
<Badge variant={isConfigured ? "default" : "destructive"}>
  <Icon className="w-3 h-3" />
  Status Text
</Badge>
```

### AnalysisProgress
```tsx
// Progreso detallado con contexto
<AnalysisProgress
  isAnalyzing={true}
  totalDuration={videoDuration}
  currentProgress={progressPercent}
  currentChunk={chunkNumber}
  totalChunks={totalChunks}
/>
```