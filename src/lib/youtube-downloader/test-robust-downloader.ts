import { RobustDownloader, YouTubeDownloaderInit, ErrorHandler } from './index';

/**
 * Script de prueba para el descargador robusto
 */
async function testRobustDownloader() {
  console.log('🧪 Testing Robust Downloader...\n');

  try {
    // Inicializar el sistema
    await YouTubeDownloaderInit.initialize();

    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo"

    // Test 1: Extracción robusta de información de video
    console.log('1. Testing robust video info extraction...');
    try {
      const { videoInfo, stats } = await RobustDownloader.getVideoInfoRobust(testUrl, {
        enableUserAgentRotation: true,
        enableRandomDelays: true,
        customRetryOptions: {
          maxRetries: 2,
          baseDelay: 1000
        }
      });

      console.log('✅ Video info extracted successfully:');
      console.log(`   Title: ${videoInfo.title}`);
      console.log(`   Duration: ${Math.floor(videoInfo.duration / 60)}:${(videoInfo.duration % 60).toString().padStart(2, '0')}`);
      console.log(`   Uploader: ${videoInfo.uploader}`);
      console.log(`   Formats available: ${videoInfo.formats.length}`);
      
      console.log('\n📊 Extraction Stats:');
      console.log(`   Total attempts: ${stats.totalAttempts}`);
      console.log(`   Successful attempt: ${stats.successfulAttempt}`);
      console.log(`   Total time: ${stats.totalTime}ms`);
      console.log(`   Strategies used: ${stats.strategiesUsed.join(', ')}`);
      console.log(`   Errors encountered: ${stats.errorsEncountered.length}`);
      
      if (stats.finalUserAgent) {
        console.log(`   Final user agent: ${stats.finalUserAgent.substring(0, 50)}...`);
      }

      // Obtener métricas de rendimiento
      const metrics = RobustDownloader.getPerformanceMetrics(stats);
      console.log('\n📈 Performance Metrics:');
      console.log(`   Efficiency: ${metrics.efficiency.toFixed(1)}%`);
      console.log(`   Success rate: ${metrics.successRate.toFixed(1)}%`);
      console.log(`   Average attempt time: ${metrics.averageAttemptTime.toFixed(0)}ms`);

    } catch (error) {
      console.error('❌ Robust video info extraction failed:', error);
      
      if (error instanceof Error) {
        const errorInfo = ErrorHandler.analyzeError(error, {
          url: testUrl,
          operation: 'getVideoInfoRobust',
          timestamp: Date.now()
        });
        
        console.error('\n🔍 Error Analysis:');
        console.error(`   Code: ${errorInfo.code}`);
        console.error(`   User message: ${errorInfo.userMessage}`);
        console.error(`   Retryable: ${errorInfo.isRetryable}`);
        console.error(`   Suggested action: ${errorInfo.suggestedAction}`);
      }
    }

    // Test 2: Quick check robusto
    console.log('\n2. Testing robust quick check...');
    try {
      const isAvailable = await RobustDownloader.quickCheckRobust(testUrl);
      console.log(`✅ Video availability: ${isAvailable}`);
    } catch (error) {
      console.error('❌ Robust quick check failed:', error);
    }

    // Test 3: Prueba de manejo de errores con URL inválida
    console.log('\n3. Testing error handling with invalid URL...');
    try {
      await RobustDownloader.getVideoInfoRobust('https://www.youtube.com/watch?v=invalid123', {
        enableUserAgentRotation: true,
        customRetryOptions: {
          maxRetries: 1,
          baseDelay: 500
        }
      });
    } catch (error) {
      console.log('✅ Error handling working correctly');
      
      if (error instanceof Error) {
        const errorInfo = ErrorHandler.analyzeError(error, {
          url: 'https://www.youtube.com/watch?v=invalid123',
          operation: 'getVideoInfoRobust',
          timestamp: Date.now()
        });
        
        console.log('🔍 Error Analysis for invalid URL:');
        console.log(`   Code: ${errorInfo.code}`);
        console.log(`   User message: ${errorInfo.userMessage}`);
        console.log(`   Retryable: ${errorInfo.isRetryable}`);
        console.log(`   Suggested action: ${errorInfo.suggestedAction}`);
      }
    }

    // Test 4: Prueba de diferentes tipos de errores
    console.log('\n4. Testing error pattern recognition...');
    const testErrors = [
      'HTTP Error 403: Forbidden',
      'Network error: Connection timeout',
      'Video unavailable: This video is private',
      'HTTP Error 429: Too Many Requests',
      'Permission denied: Cannot write to directory',
      'Unknown error: Something went wrong'
    ];

    testErrors.forEach((errorMessage, index) => {
      console.log(`\n   Test error ${index + 1}: "${errorMessage}"`);
      const errorInfo = ErrorHandler.analyzeError(new Error(errorMessage));
      console.log(`     Code: ${errorInfo.code}`);
      console.log(`     Retryable: ${errorInfo.isRetryable}`);
      console.log(`     Suggested action: ${errorInfo.suggestedAction}`);
    });

    console.log('\n🎉 Robust Downloader tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Ejecutar solo si este archivo es llamado directamente
if (require.main === module) {
  testRobustDownloader();
}

export { testRobustDownloader };