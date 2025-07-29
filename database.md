# Database Schema - Esquemas y Patrones de Datos

## Esquema Local Storage (JSON)

### Estructura de Proyecto Local
```json
{
  "id": "uuid-v4",
  "name": "string",
  "originalVideoPath": "string (ruta absoluta local)",
  "originalVideoUrl": "string (/api/videos/filename)",
  "duration": "number (segundos)",
  "createdAt": "string (ISO)",
  "lastModified": "string (ISO)",
  "scenes": [
    {
      "id": "number (incremental)",
      "startTime": "string (HH:MM:SS.mmm)",
      "endTime": "string (HH:MM:SS.mmm)",
      "description": "string",
      "thumbnail": "string (data URI base64 o vacío)"
    }
  ],
  "status": "uploaded | analyzing | analyzed | error",
  "analysisError": "string (opcional)"
}
```

### Estructura de Directorios Locales
```
local-storage/
├── projects.json          # Base de datos principal
├── videos/               # Archivos de video
│   ├── {uuid}_{filename}
│   └── ...
└── projects/            # Metadatos futuros (reservado)
```

## Patrones de Consulta

### Patrón: Lectura con Ordenamiento por Fecha
```javascript
// Obtener proyectos ordenados por última modificación
function getAllProjects(): Project[] {
  const projects = readDatabase();
  return projects.sort((a, b) => 
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
}
```

### Patrón: Actualización Atómica con Timestamp
```javascript
// Actualizar proyecto con timestamp automático
function updateProject(id: string, updates: Partial<Project>): Project | null {
  const projects = readDatabase();
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  projects[index] = {
    ...projects[index],
    ...updates,
    lastModified: new Date().toISOString()
  };
  
  writeDatabase(projects);
  return projects[index];
}
```

### Patrón: Eliminación con Limpieza de Archivos
```javascript
// Eliminar proyecto y archivos asociados
function deleteProject(id: string): boolean {
  const projects = readDatabase();
  const project = projects.find(p => p.id === id);
  
  if (!project) return false;
  
  // Limpiar archivo de video
  if (fs.existsSync(project.originalVideoPath)) {
    fs.unlinkSync(project.originalVideoPath);
  }
  
  // Actualizar base de datos
  const filteredProjects = projects.filter(p => p.id !== id);
  writeDatabase(filteredProjects);
  
  return true;
}
```

## Esquemas de Validación

### Validación de Escena
```javascript
const ShotSchema = z.object({
  id: z.number(),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}\.\d{3}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}\.\d{3}$/),
  description: z.string().min(1),
  thumbnail: z.string().optional()
});
```

### Validación de Proyecto
```javascript
const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  originalVideoPath: z.string(),
  originalVideoUrl: z.string(),
  duration: z.number().positive(),
  createdAt: z.string().datetime(),
  lastModified: z.string().datetime(),
  scenes: z.array(ShotSchema),
  status: z.enum(['uploaded', 'analyzing', 'analyzed', 'error']),
  analysisError: z.string().optional()
});
```

## Patrones de Migración de Datos

### Patrón: Conversión de Tiempo Gemini a Estándar
```javascript
// Convertir formato MM:SS:mmm de Gemini a segundos
function timeStringToSeconds(time: string): number {
  const parts = time.split(':');
  
  if (parts.length === 3) {
    // Formato Gemini: MM:SS:mmm (milisegundos, no decimales)
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    const milliseconds = parseInt(parts[2], 10);
    
    return minutes * 60 + seconds + milliseconds / 1000;
  }
  
  return 0;
}

// Convertir segundos a formato estándar HH:MM:SS.mmm
function secondsToTimeString(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const formattedSeconds = seconds.toFixed(3);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${formattedSeconds.padStart(6, '0')}`;
}
```

### Patrón: Ajuste de Tiempos por Chunks
```javascript
// Ajustar tiempos de escenas según offset de chunk
function adjustSceneTimesForChunk(scenes: Scene[], chunkStartTime: number): Scene[] {
  return scenes.map(scene => ({
    ...scene,
    startTime: secondsToTimeString(timeStringToSeconds(scene.startTime) + chunkStartTime),
    endTime: secondsToTimeString(timeStringToSeconds(scene.endTime) + chunkStartTime)
  }));
}
```