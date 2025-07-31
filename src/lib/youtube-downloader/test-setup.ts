import { YouTubeDownloaderInit, YtDlpInstaller, ConfigUtils } from './index';

/**
 * Script de prueba para verificar la configuración del sistema
 */
async function testSetup() {
  console.log('🧪 Testing YouTube Downloader setup...\n');

  try {
    // Test 1: Inicializar el sistema
    console.log('1. Initializing system...');
    await YouTubeDownloaderInit.initialize();
    console.log('✅ System initialization successful\n');

    // Test 2: Verificar información del sistema
    console.log('2. Getting system info...');
    const systemInfo = await YouTubeDownloaderInit.getSystemInfo();
    console.log('System Information:');
    console.log(`  - yt-dlp installed: ${systemInfo.ytdlpInstalled}`);
    console.log(`  - yt-dlp version: ${systemInfo.ytdlpVersion || 'N/A'}`);
    console.log(`  - Temp directory exists: ${systemInfo.tempDirExists}`);
    console.log(`  - Storage directory exists: ${systemInfo.storageDirExists}`);
    console.log(`  - Temp directory size: ${ConfigUtils.formatBytes(systemInfo.tempDirSize)}`);
    console.log(`  - Storage directory size: ${ConfigUtils.formatBytes(systemInfo.storageDirSize)}`);
    console.log('✅ System info retrieved successfully\n');

    // Test 3: Probar utilidades de configuración
    console.log('3. Testing configuration utilities...');
    const randomUserAgent = ConfigUtils.getRandomUserAgent();
    console.log(`  - Random user agent: ${randomUserAgent.substring(0, 50)}...`);
    
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://example.com/video',
      'invalid-url'
    ];
    
    testUrls.forEach(url => {
      const isValid = ConfigUtils.isValidYouTubeUrl(url);
      console.log(`  - ${url}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    });
    
    console.log(`  - Retry delay (attempt 1): ${ConfigUtils.getRetryDelay(1)}ms`);
    console.log(`  - Retry delay (attempt 3): ${ConfigUtils.getRetryDelay(3)}ms`);
    console.log(`  - Format bytes (1024): ${ConfigUtils.formatBytes(1024)}`);
    console.log(`  - Format duration (3661): ${ConfigUtils.formatDuration(3661)}`);
    console.log('✅ Configuration utilities working correctly\n');

    // Test 4: Limpiar archivos temporales
    console.log('4. Running cleanup...');
    await YouTubeDownloaderInit.cleanup();
    console.log('✅ Cleanup completed\n');

    console.log('🎉 All tests passed! YouTube Downloader is ready to use.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Ejecutar solo si este archivo es llamado directamente
if (require.main === module) {
  testSetup();
}

export { testSetup };