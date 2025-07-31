import { YtDlpWrapper, YouTubeDownloaderInit } from './index';

/**
 * Script de prueba con un video real de YouTube
 */
async function testRealVideo() {
  console.log('🧪 Testing with a real YouTube video...\n');

  try {
    // Inicializar el sistema
    await YouTubeDownloaderInit.initialize();

    // Usar un video público conocido (video oficial de YouTube)
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo" - primer video de YouTube

    console.log(`🔍 Testing URL: ${testUrl}`);
    
    // Validar URL
    const validation = YtDlpWrapper.validateUrl(testUrl);
    console.log(`✅ URL validation: ${validation.isValid}`);
    if (validation.isValid) {
      console.log(`   Video ID: ${validation.videoId}`);
    }

    // Quick check
    console.log('🔍 Checking video availability...');
    const isAvailable = await YtDlpWrapper.quickCheck(testUrl);
    console.log(`✅ Video available: ${isAvailable}`);

    if (isAvailable) {
      console.log('🔍 Extracting full video information...');
      try {
        const videoInfo = await YtDlpWrapper.getVideoInfo(testUrl);
        
        console.log('\n📊 Video Information:');
        console.log(`   Title: ${videoInfo.title}`);
        console.log(`   Duration: ${Math.floor(videoInfo.duration / 60)}:${(videoInfo.duration % 60).toString().padStart(2, '0')}`);
        console.log(`   Uploader: ${videoInfo.uploader}`);
        console.log(`   Upload date: ${videoInfo.upload_date}`);
        console.log(`   View count: ${videoInfo.view_count?.toLocaleString() || 'N/A'}`);
        console.log(`   Available formats: ${videoInfo.formats.length}`);
        
        // Mostrar algunas opciones de calidad
        const qualityOptions = YtDlpWrapper.getQualityOptions(videoInfo);
        console.log('\n🎥 Quality Options:');
        qualityOptions.slice(0, 5).forEach((option, index) => {
          console.log(`   ${index + 1}. ${option.label} - ${option.filesizeFormatted}`);
        });
        
        console.log('\n✅ Video information extracted successfully!');
        
      } catch (error) {
        console.error(`❌ Failed to extract video info: ${(error as Error).message}`);
      }
    } else {
      console.log('⚠️ Video not available for testing');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Ejecutar solo si este archivo es llamado directamente
if (require.main === module) {
  testRealVideo();
}

export { testRealVideo };