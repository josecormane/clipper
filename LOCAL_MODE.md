# 🏠 Local Mode - Video Analysis Without Cloud Dependencies

Esta aplicación ahora incluye un **modo completamente local** que te permite analizar videos sin depender de servicios en la nube como Firebase o Google Cloud Storage.

## ✨ Características del Modo Local

### 🔒 **Privacidad Total**
- Videos almacenados localmente en tu máquina
- No se suben datos a servicios externos
- Solo tu API key de Gemini se usa para análisis

### ⚡ **Rendimiento Mejorado**
- Sin tiempos de subida a la nube
- Acceso directo a archivos locales
- Procesamiento más rápido

### 💰 **Control de Costos**
- Solo pagas por el análisis con Gemini
- Sin costos de almacenamiento en la nube
- Control total sobre el uso de API

## 🚀 Cómo Usar el Modo Local

### 1. **Acceder al Modo Local**
```
http://localhost:3000/local
```

### 2. **Configurar API Key de Gemini** (una sola vez)
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Crea una API key gratuita
3. En la aplicación, haz clic en "Configurar API"
4. Pega tu API key y guarda

### 3. **Subir y Analizar Videos**
1. Arrastra un video o haz clic para seleccionar
2. Ingresa un nombre para el proyecto
3. Haz clic en "Create Project"
4. Una vez creado, haz clic en "Analyze Project"

## 📁 Estructura de Archivos Locales

```
local-storage/
├── projects.json          # Base de datos de proyectos
├── videos/               # Videos subidos
│   ├── uuid1_video1.mp4
│   └── uuid2_video2.mp4
└── projects/            # Metadatos (futuro)
```

## 🛠️ Funcionalidades Disponibles

### ✅ **Gestión de Proyectos**
- Crear proyectos subiendo videos
- Ver lista de proyectos locales
- Eliminar proyectos (incluye archivos)
- Estadísticas de almacenamiento

### 🎬 **Análisis de Videos**
- Análisis automático con Gemini AI
- Detección de escenas y cortes
- Generación de descripciones
- Thumbnails automáticos con regeneración inteligente
- Corrección automática de tiempos de Gemini (formato MM:SS:mmm)

### ✂️ **Edición de Escenas**
- Dividir escenas en puntos específicos
- Fusionar múltiples escenas
- Editar descripciones de escenas
- Vista de timeline interactiva con arrastre
- **Regeneración automática de thumbnails** al cambiar tiempos de inicio
- Preservación de gaps entre escenas durante edición

### 📥 **Exportación**
- Descargar clips individuales
- Descargar todos los clips
- Formato MP4 optimizado

## 🔧 Configuración Técnica

### **Requisitos**
- Node.js 18+
- FFmpeg instalado en el sistema
- API key de Gemini (gratuita)

### **Instalación de FFmpeg**

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
```bash
# Con Chocolatey
choco install ffmpeg

# O descargar desde https://ffmpeg.org/download.html
```

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

### **Variables de Entorno**
```env
# Opcional: API key por defecto
GOOGLE_GENAI_API_KEY=tu-api-key-aqui
```

## 🆚 Comparación: Local vs Cloud

| Característica | Modo Local | Modo Cloud |
|---|---|---|
| **Almacenamiento** | Local | Firebase/GCS |
| **Privacidad** | ✅ Total | ⚠️ Datos en la nube |
| **Velocidad** | ✅ Rápido | ⚠️ Depende de internet |
| **Costos** | ✅ Solo Gemini API | ❌ + Storage + Firestore |
| **Configuración** | ✅ Simple | ❌ Compleja |
| **Backup** | ⚠️ Manual | ✅ Automático |

## 🐛 Solución de Problemas

### **Error: "FFmpeg not found"**
- Instala FFmpeg siguiendo las instrucciones arriba
- Reinicia la aplicación después de instalar

### **Error: "API key required"**
- Configura tu API key de Gemini en la interfaz
- Verifica que la key sea válida

### **Thumbnails no se generan**
- Verifica que FFmpeg esté instalado correctamente
- Los thumbnails fallan silenciosamente, el análisis continúa
- **Regeneración automática**: Los thumbnails se actualizan automáticamente al cambiar tiempos en el timeline
- Usa el botón "Fix Thumbnails" para regenerar todos los thumbnails manualmente

### **Videos no se reproducen**
- Verifica que el formato sea compatible (MP4, MOV, AVI, etc.)
- Algunos codecs pueden no ser compatibles

## 📊 Monitoreo y Debug

### **Página de Debug** (solo desarrollo)
```
http://localhost:3000/debug-times
```
- Prueba conversiones de tiempo
- Verifica cálculos de chunks
- Debug de problemas de sincronización

### **Logs del Servidor**
- Los logs aparecen en la consola del servidor
- Incluyen progreso de análisis y errores de FFmpeg

## 🔄 Migración de Datos

### **Exportar Proyectos**
Los proyectos locales se almacenan en:
- **Base de datos**: `local-storage/projects.json`
- **Videos**: `local-storage/videos/`

### **Backup Manual**
```bash
# Crear backup
cp -r local-storage/ backup-$(date +%Y%m%d)/

# Restaurar backup
cp -r backup-20240129/ local-storage/
```

## 🚀 Próximas Funcionalidades

- [ ] Exportar/importar proyectos
- [ ] Compresión automática de videos
- [ ] Análisis por lotes
- [ ] Integración con editores de video
- [ ] API REST para automatización

## 💡 Consejos de Uso

1. **Videos Largos**: Se procesan en chunks de 4 minutos automáticamente
2. **Calidad vs Velocidad**: Videos más cortos = análisis más rápido
3. **Almacenamiento**: Monitorea el espacio usado en la interfaz
4. **Backup**: Haz copias de seguridad periódicas de `local-storage/`
5. **API Limits**: Respeta los límites de la API gratuita de Gemini

---

¿Preguntas? Revisa la documentación completa o abre un issue en el repositorio.