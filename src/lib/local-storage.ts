import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Directorio base para almacenamiento local
const STORAGE_DIR = path.join(process.cwd(), 'local-storage');
const PROJECTS_DIR = path.join(STORAGE_DIR, 'projects');
const VIDEOS_DIR = path.join(STORAGE_DIR, 'videos');
const DB_FILE = path.join(STORAGE_DIR, 'projects.json');

// Tipos
export interface Scene {
  id: number;
  startTime: string;
  endTime: string;
  description: string;
  thumbnail?: string;
}

export interface YouTubeMetadata {
  videoId: string;
  uploader: string;
  uploaderUrl?: string;
  uploadDate: string;
  originalTitle: string;
  viewCount?: number;
  likeCount?: number;
  description?: string;
  tags?: string[];
  category?: string;
  thumbnailUrl?: string;
  downloadedFormat?: string;
  downloadedQuality?: string;
}

export interface Project {
  id: string;
  name: string;
  originalVideoPath: string;
  originalVideoUrl: string;
  duration: number;
  createdAt: string;
  lastModified: string;
  scenes: Scene[];
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'error';
  analysisError?: string;
  // Nuevos campos para YouTube
  source: 'upload' | 'youtube';
  sourceUrl?: string; // URL original de YouTube
  youtubeMetadata?: YouTubeMetadata;
  originalScenes?: Scene[]; // Backup de escenas originales
}

// Inicializar directorios
export function initializeStorage() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
  }
}

// Leer base de datos
function readDatabase(): Project[] {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return [];
  }
}

// Escribir base de datos
function writeDatabase(projects: Project[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(projects, null, 2));
  } catch (error) {
    console.error('Error writing database:', error);
    throw error;
  }
}

// Operaciones CRUD

export function getAllProjects(): Project[] {
  initializeStorage();
  return readDatabase().sort((a, b) => 
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
}

export function getProject(id: string): Project | null {
  initializeStorage();
  const projects = readDatabase();
  return projects.find(p => p.id === id) || null;
}

export function createProject(data: {
  name: string;
  videoBuffer: Buffer;
  originalFileName: string;
  duration: number;
}): Project {
  initializeStorage();
  
  const projectId = uuidv4();
  const videoFileName = `${projectId}_${data.originalFileName}`;
  const videoPath = path.join(VIDEOS_DIR, videoFileName);
  
  // Guardar archivo de video
  fs.writeFileSync(videoPath, data.videoBuffer);
  
  const project: Project = {
    id: projectId,
    name: data.name,
    originalVideoPath: videoPath,
    originalVideoUrl: `/api/videos/${videoFileName}`,
    duration: data.duration,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    scenes: [],
    status: 'uploaded',
    source: 'upload' // Marcar como upload tradicional
  };
  
  const projects = readDatabase();
  projects.push(project);
  writeDatabase(projects);
  
  return project;
}

export function createYouTubeProject(data: {
  name: string;
  videoFilePath: string;
  duration: number;
  sourceUrl: string;
  youtubeMetadata: YouTubeMetadata;
}): Project {
  initializeStorage();
  
  const projectId = uuidv4();
  const videoFileName = `youtube_${projectId}_${data.youtubeMetadata.videoId}.${data.youtubeMetadata.downloadedFormat || 'mp4'}`;
  const finalVideoPath = path.join(VIDEOS_DIR, videoFileName);
  
  // Mover el archivo descargado al directorio final
  if (fs.existsSync(data.videoFilePath)) {
    fs.copyFileSync(data.videoFilePath, finalVideoPath);
    
    // Limpiar archivo temporal
    try {
      fs.unlinkSync(data.videoFilePath);
    } catch (error) {
      console.warn('Warning: Could not delete temporary file:', error);
    }
  } else {
    throw new Error(`Video file not found: ${data.videoFilePath}`);
  }
  
  const project: Project = {
    id: projectId,
    name: data.name,
    originalVideoPath: finalVideoPath,
    originalVideoUrl: `/api/videos/${videoFileName}`,
    duration: data.duration,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    scenes: [],
    status: 'uploaded',
    source: 'youtube',
    sourceUrl: data.sourceUrl,
    youtubeMetadata: data.youtubeMetadata
  };
  
  const projects = readDatabase();
  projects.push(project);
  writeDatabase(projects);
  
  console.log(`✅ YouTube project created: ${project.name}`);
  console.log(`📁 Video saved: ${finalVideoPath}`);
  console.log(`🎬 YouTube ID: ${data.youtubeMetadata.videoId}`);
  console.log(`👤 Uploader: ${data.youtubeMetadata.uploader}`);
  
  return project;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  initializeStorage();
  
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

export function deleteProject(id: string): boolean {
  initializeStorage();
  
  const projects = readDatabase();
  const project = projects.find(p => p.id === id);
  
  if (!project) return false;
  
  // Eliminar archivo de video
  try {
    if (fs.existsSync(project.originalVideoPath)) {
      fs.unlinkSync(project.originalVideoPath);
    }
  } catch (error) {
    console.warn('Error deleting video file:', error);
  }
  
  // Eliminar del database
  const filteredProjects = projects.filter(p => p.id !== id);
  writeDatabase(filteredProjects);
  
  return true;
}

export function getVideoPath(fileName: string): string {
  return path.join(VIDEOS_DIR, fileName);
}

export function getStorageStats() {
  initializeStorage();
  
  const projects = readDatabase();
  let totalSize = 0;
  
  projects.forEach(project => {
    try {
      if (fs.existsSync(project.originalVideoPath)) {
        const stats = fs.statSync(project.originalVideoPath);
        totalSize += stats.size;
      }
    } catch (error) {
      console.warn('Error getting file stats:', error);
    }
  });
  
  return {
    projectCount: projects.length,
    totalSize,
    totalSizeFormatted: formatBytes(totalSize)
  };
}

// Funciones específicas para YouTube

export function findProjectByYouTubeUrl(youtubeUrl: string): Project | null {
  initializeStorage();
  const projects = readDatabase();
  
  // Normalizar URL para comparación
  const normalizedUrl = normalizeYouTubeUrl(youtubeUrl);
  if (!normalizedUrl) return null;
  
  return projects.find(project => 
    project.source === 'youtube' && 
    project.sourceUrl && 
    normalizeYouTubeUrl(project.sourceUrl) === normalizedUrl
  ) || null;
}

export function findProjectByYouTubeVideoId(videoId: string): Project | null {
  initializeStorage();
  const projects = readDatabase();
  
  return projects.find(project => 
    project.source === 'youtube' && 
    project.youtubeMetadata?.videoId === videoId
  ) || null;
}

export function getYouTubeProjects(): Project[] {
  initializeStorage();
  const projects = readDatabase();
  
  return projects
    .filter(project => project.source === 'youtube')
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
}

export function getUploadedProjects(): Project[] {
  initializeStorage();
  const projects = readDatabase();
  
  return projects
    .filter(project => project.source === 'upload')
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
}

export function checkYouTubeDuplicate(youtubeUrl: string): {
  isDuplicate: boolean;
  existingProject?: Project;
  videoId?: string;
} {
  const normalizedUrl = normalizeYouTubeUrl(youtubeUrl);
  if (!normalizedUrl) {
    return { isDuplicate: false };
  }
  
  const videoId = extractYouTubeVideoId(normalizedUrl);
  if (!videoId) {
    return { isDuplicate: false };
  }
  
  const existingProject = findProjectByYouTubeVideoId(videoId);
  
  return {
    isDuplicate: !!existingProject,
    existingProject: existingProject || undefined,
    videoId
  };
}

// Funciones auxiliares

function normalizeYouTubeUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    
    // Verificar que sea una URL de YouTube
    if (!['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'].includes(parsedUrl.hostname)) {
      return null;
    }
    
    let videoId: string | null = null;
    
    if (parsedUrl.hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.slice(1);
    } else if (parsedUrl.hostname.includes('youtube.com')) {
      videoId = parsedUrl.searchParams.get('v');
    }
    
    if (!videoId || videoId.length !== 11) {
      return null;
    }
    
    // Devolver URL normalizada
    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch {
    return null;
  }
}

function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    
    if (parsedUrl.hostname === 'youtu.be') {
      return parsedUrl.pathname.slice(1);
    } else if (parsedUrl.hostname.includes('youtube.com')) {
      return parsedUrl.searchParams.get('v');
    }
    
    return null;
  } catch {
    return null;
  }
}

// Estadísticas extendidas

export function getExtendedStorageStats() {
  initializeStorage();
  
  const projects = readDatabase();
  let totalSize = 0;
  let youtubeSize = 0;
  let uploadSize = 0;
  let youtubeCount = 0;
  let uploadCount = 0;
  
  projects.forEach(project => {
    try {
      if (fs.existsSync(project.originalVideoPath)) {
        const stats = fs.statSync(project.originalVideoPath);
        const fileSize = stats.size;
        
        totalSize += fileSize;
        
        if (project.source === 'youtube') {
          youtubeSize += fileSize;
          youtubeCount++;
        } else {
          uploadSize += fileSize;
          uploadCount++;
        }
      }
    } catch (error) {
      console.warn('Error getting file stats:', error);
    }
  });
  
  return {
    total: {
      projectCount: projects.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize)
    },
    youtube: {
      projectCount: youtubeCount,
      totalSize: youtubeSize,
      totalSizeFormatted: formatBytes(youtubeSize)
    },
    uploads: {
      projectCount: uploadCount,
      totalSize: uploadSize,
      totalSizeFormatted: formatBytes(uploadSize)
    }
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}