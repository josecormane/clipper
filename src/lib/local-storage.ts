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
    status: 'uploaded'
  };
  
  const projects = readDatabase();
  projects.push(project);
  writeDatabase(projects);
  
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}