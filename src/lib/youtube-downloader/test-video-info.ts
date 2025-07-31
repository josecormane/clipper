import { YtDlpWrapper, YouTubeDownloaderInit } from './index';

/**
 * Script de prueba para verificar la extracción de información de videos
 */
async function testVideoInfo() {
  console.log('🧪 Testing video information extraction...\n');

  try {
    // Inicializar el sistema
    console.log('1. Initializing system...');
    await YouTubeDownloaderInit.initialize();
    console.log('✅ System initialized\n');

    // URLs de prueba (usando videos públicos conocidos)
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll - video público conocido
      'https://youtu.be/dQw4w9WgXcQ', // Mismo video, formato corto
      'https://www.youtube.com/watch?v=invalid123', // Video inválido
      'https://example.com/video' // URL no válida
    ];

    for (const url of testUrls) {
      console.log(`\n🔍 Testing URL: ${url}`);
      
      // Test 1: Validación de URL
      console.log('  - Validating URL...');
      const validation = YtDlpWrapper.validateUrl(url);
      console.log(`    Valid: ${validation.isValid}`);
      if (validation.isValid) {
        console.log(`    Video ID: ${validation.videoId}`);
        console.log(`    Normalized URL: ${validation.normalizedUrl}`);
      } else {
        console.log(`    Error: ${validation.error}`);
        continue; // Skip to next URL if invalid
      }

      // Test 2: Información básica
      console.log('  - Getting basic info...');
      const basicInfo = YtDlpWrapper.getBasicVideoInfo(url);
      if (basicInfo) {
        console.log(`    Thumbnail URL: ${basicInfo.thumbnailUrl}`);
        console.log(`    Estimated title: ${basicInfo.estimatedTitle}`);
      }

      // Test 3: Quick check (verificar disponibilidad)
      console.log('  - Quick availability check...');
      try {
        const isAvailable = await YtDlpWrapper.quickCheck(url);
        console.log(`    Available: ${isAvailable}`);
        
        if (!isAvailable) {
          console.log('    ⚠️ Video not available, skipping full info extraction');
          continue;
        }
      } catch (error) {
        console.log(`    ❌ Quick check failed: ${(error as Error).message}`);
        continue;
      }

      // Test 4: Extracción completa de información (solo para el primer video válido)
      if (url === testUrls[0]) {
        console.log('  - Extracting full video info...');
        try {
          const videoInfo = await YtDlpWrapper.getVideoInfo(url);
          
          console.log(`    ✅ Title: ${videoInfo.title}`);
          console.log(`    Duration: ${Math.floor(videoInfo.duration / 60)}:${(videoInfo.duration % 60).toString().padStart(2, '0')}`);
          console.log(`    Uploader: ${videoInfo.uploader}`);
          console.log(`    Upload date: ${videoInfo.upload_date}`);
          console.log(`    Available formats: ${videoInfo.formats.length}`);
          
          // Test 5: Opciones de calidad
          console.log('  - Getting quality options...');
          const qualityOptions = YtDlpWrapper.getQualityOptions(videoInfo);
          console.log(`    Quality options: ${qualityOptions.length}`);
          
          qualityOptions.slice(0, 3).forEach((option, index) => {
            console.log(`    ${index + 1}. ${option.label} - ${option.filesizeFormatted}`);
          });
          
        } catch (error) {
          console.log(`    ❌ Failed to extract video info: ${(error as Error).message}`);
        }
      }
    }

    console.log('\n🎉 Video information extraction tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Ejecutar solo si este archivo es llamado directamente
if (require.main === module) {
  testVideoInfo();
}

export { testVideoInfo };