import { 
  createYouTubeProject, 
  findProjectByYouTubeUrl, 
  findProjectByYouTubeVideoId,
  checkYouTubeDuplicate,
  getYouTubeProjects,
  getUploadedProjects,
  getExtendedStorageStats,
  initializeStorage
} from '../local-storage';
import { YouTubeDownloaderInit } from './index';
import fs from 'fs';
import path from 'path';

/**
 * Script de prueba para la integración del almacenamiento local con YouTube
 */
async function testStorageIntegration() {
  console.log('🧪 Testing YouTube Storage Integration...\n');

  try {
    // Inicializar sistemas
    await YouTubeDownloaderInit.initialize();
    initializeStorage();

    // Test 1: Crear un proyecto de YouTube simulado
    console.log('1. Creating simulated YouTube project...');
    
    // Crear un archivo de video temporal para la prueba
    const tempVideoPath = path.join(process.cwd(), 'temp', 'test-video.mp4');
    const tempDir = path.dirname(tempVideoPath);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Crear un archivo de prueba pequeño
    fs.writeFileSync(tempVideoPath, Buffer.from('fake video content for testing'));

    const testYouTubeMetadata = {
      videoId: 'jNQXAC9IVRw',
      uploader: 'jawed',
      uploadDate: '20050424',
      originalTitle: 'Me at the zoo',
      viewCount: 367713552,
      likeCount: 12345678,
      description: 'The first video on YouTube',
      tags: ['first', 'youtube', 'zoo'],
      category: 'People & Blogs',
      thumbnailUrl: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
      downloadedFormat: 'mp4',
      downloadedQuality: '240p'
    };

    const youtubeProject = createYouTubeProject({
      name: 'Me at the zoo (YouTube)',
      videoFilePath: tempVideoPath,
      duration: 19,
      sourceUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      youtubeMetadata: testYouTubeMetadata
    });

    console.log('✅ YouTube project created successfully:');
    console.log(`   ID: ${youtubeProject.id}`);
    console.log(`   Name: ${youtubeProject.name}`);
    console.log(`   Source: ${youtubeProject.source}`);
    console.log(`   YouTube ID: ${youtubeProject.youtubeMetadata?.videoId}`);
    console.log(`   Uploader: ${youtubeProject.youtubeMetadata?.uploader}`);

    // Test 2: Buscar proyecto por URL de YouTube
    console.log('\n2. Testing search by YouTube URL...');
    
    const testUrls = [
      'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      'https://youtu.be/jNQXAC9IVRw',
      'https://www.youtube.com/watch?v=jNQXAC9IVRw&t=10s',
      'https://www.youtube.com/watch?v=nonexistent123'
    ];

    testUrls.forEach(url => {
      const foundProject = findProjectByYouTubeUrl(url);
      console.log(`   URL: ${url}`);
      console.log(`   Found: ${foundProject ? foundProject.name : 'Not found'}`);
    });

    // Test 3: Buscar proyecto por video ID
    console.log('\n3. Testing search by video ID...');
    
    const testVideoIds = ['jNQXAC9IVRw', 'nonexistent123'];
    
    testVideoIds.forEach(videoId => {
      const foundProject = findProjectByYouTubeVideoId(videoId);
      console.log(`   Video ID: ${videoId}`);
      console.log(`   Found: ${foundProject ? foundProject.name : 'Not found'}`);
    });

    // Test 4: Verificar duplicados
    console.log('\n4. Testing duplicate detection...');
    
    const duplicateTestUrls = [
      'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Debería ser duplicado
      'https://youtu.be/jNQXAC9IVRw', // Debería ser duplicado (misma URL normalizada)
      'https://www.youtube.com/watch?v=newvideo123', // No debería ser duplicado
      'https://example.com/video' // URL inválida
    ];

    duplicateTestUrls.forEach(url => {
      const duplicateCheck = checkYouTubeDuplicate(url);
      console.log(`   URL: ${url}`);
      console.log(`   Is duplicate: ${duplicateCheck.isDuplicate}`);
      console.log(`   Video ID: ${duplicateCheck.videoId || 'N/A'}`);
      if (duplicateCheck.existingProject) {
        console.log(`   Existing project: ${duplicateCheck.existingProject.name}`);
      }
    });

    // Test 5: Obtener proyectos por fuente
    console.log('\n5. Testing project filtering by source...');
    
    const youtubeProjects = getYouTubeProjects();
    const uploadedProjects = getUploadedProjects();
    
    console.log(`   YouTube projects: ${youtubeProjects.length}`);
    youtubeProjects.forEach(project => {
      console.log(`     - ${project.name} (${project.youtubeMetadata?.videoId})`);
    });
    
    console.log(`   Uploaded projects: ${uploadedProjects.length}`);
    uploadedProjects.forEach(project => {
      console.log(`     - ${project.name}`);
    });

    // Test 6: Estadísticas extendidas
    console.log('\n6. Testing extended storage statistics...');
    
    const extendedStats = getExtendedStorageStats();
    
    console.log('   Total Statistics:');
    console.log(`     Projects: ${extendedStats.total.projectCount}`);
    console.log(`     Size: ${extendedStats.total.totalSizeFormatted}`);
    
    console.log('   YouTube Statistics:');
    console.log(`     Projects: ${extendedStats.youtube.projectCount}`);
    console.log(`     Size: ${extendedStats.youtube.totalSizeFormatted}`);
    
    console.log('   Upload Statistics:');
    console.log(`     Projects: ${extendedStats.uploads.projectCount}`);
    console.log(`     Size: ${extendedStats.uploads.totalSizeFormatted}`);

    // Test 7: Verificar estructura del proyecto YouTube
    console.log('\n7. Testing YouTube project structure...');
    
    console.log('   Project structure:');
    console.log(`     ID: ${youtubeProject.id}`);
    console.log(`     Name: ${youtubeProject.name}`);
    console.log(`     Source: ${youtubeProject.source}`);
    console.log(`     Source URL: ${youtubeProject.sourceUrl}`);
    console.log(`     Duration: ${youtubeProject.duration}s`);
    console.log(`     Status: ${youtubeProject.status}`);
    console.log(`     Created: ${youtubeProject.createdAt}`);
    
    if (youtubeProject.youtubeMetadata) {
      console.log('   YouTube Metadata:');
      console.log(`     Video ID: ${youtubeProject.youtubeMetadata.videoId}`);
      console.log(`     Original Title: ${youtubeProject.youtubeMetadata.originalTitle}`);
      console.log(`     Uploader: ${youtubeProject.youtubeMetadata.uploader}`);
      console.log(`     Upload Date: ${youtubeProject.youtubeMetadata.uploadDate}`);
      console.log(`     View Count: ${youtubeProject.youtubeMetadata.viewCount?.toLocaleString()}`);
      console.log(`     Downloaded Format: ${youtubeProject.youtubeMetadata.downloadedFormat}`);
      console.log(`     Downloaded Quality: ${youtubeProject.youtubeMetadata.downloadedQuality}`);
    }

    // Test 8: Verificar que el archivo se movió correctamente
    console.log('\n8. Testing file management...');
    
    const videoExists = fs.existsSync(youtubeProject.originalVideoPath);
    console.log(`   Video file exists: ${videoExists}`);
    
    if (videoExists) {
      const stats = fs.statSync(youtubeProject.originalVideoPath);
      console.log(`   File size: ${stats.size} bytes`);
      console.log(`   File path: ${youtubeProject.originalVideoPath}`);
    }

    console.log('\n🎉 YouTube Storage Integration tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Ejecutar solo si este archivo es llamado directamente
if (require.main === module) {
  testStorageIntegration();
}

export { testStorageIntegration };