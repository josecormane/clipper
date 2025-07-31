import { DownloadManager, YouTubeDownloaderInit, CleanupService } from './index';

/**
 * Script de prueba para el sistema de gestión de descargas
 */
async function testDownloadManager() {
  console.log('🧪 Testing Download Manager...\n');

  try {
    // Inicializar el sistema
    await YouTubeDownloaderInit.initialize();
    
    // Iniciar servicio de limpieza
    CleanupService.start();

    // Obtener instancia del gestor de descargas
    const downloadManager = DownloadManager.getInstance();

    // Configurar listeners para eventos
    downloadManager.on('sessionCreated', (session) => {
      console.log(`📥 Session created: ${session.id}`);
    });

    downloadManager.on('sessionStarted', (session) => {
      console.log(`🚀 Session started: ${session.id}`);
    });

    downloadManager.on('progressUpdated', (session) => {
      const progress = session.progress;
      if (progress.percentage) {
        console.log(`📊 Progress ${session.id}: ${progress.percentage.toFixed(1)}%`);
      }
    });

    downloadManager.on('sessionCompleted', (session) => {
      console.log(`✅ Session completed: ${session.id}`);
      console.log(`📁 Final path: ${session.finalPath}`);
    });

    downloadManager.on('sessionFailed', (session) => {
      console.log(`❌ Session failed: ${session.id}`);
      console.log(`💥 Error: ${session.error}`);
    });

    downloadManager.on('sessionCancelled', (session) => {
      console.log(`🚫 Session cancelled: ${session.id}`);
    });

    // Test 1: Crear una sesión de descarga
    console.log('1. Creating download session...');
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo"
    const sessionId = await downloadManager.startDownload(testUrl, {
      quality: 'low', // Usar calidad baja para prueba rápida
      maxFileSize: 10 * 1024 * 1024 // 10MB máximo
    });

    console.log(`📝 Session ID: ${sessionId}`);

    // Test 2: Verificar estado de la sesión
    console.log('\n2. Checking session status...');
    let session = downloadManager.getDownloadStatus(sessionId);
    if (session) {
      console.log(`   Status: ${session.status}`);
      console.log(`   URL: ${session.url}`);
      console.log(`   Options: ${JSON.stringify(session.options)}`);
    }

    // Test 3: Obtener estadísticas
    console.log('\n3. Getting download manager stats...');
    const stats = downloadManager.getStats();
    console.log(`   Total sessions: ${stats.totalSessions}`);
    console.log(`   Active sessions: ${stats.activeSessions}`);
    console.log(`   Queued sessions: ${stats.queuedSessions}`);

    // Test 4: Obtener todas las sesiones activas
    console.log('\n4. Getting all active sessions...');
    const activeSessions = downloadManager.getAllActiveSessions();
    console.log(`   Found ${activeSessions.length} active sessions`);

    // Esperar un poco para ver el progreso
    console.log('\n5. Waiting for download progress...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 5: Verificar estado actualizado
    session = downloadManager.getDownloadStatus(sessionId);
    if (session) {
      console.log(`   Updated status: ${session.status}`);
      if (session.progress.percentage) {
        console.log(`   Progress: ${session.progress.percentage.toFixed(1)}%`);
      }
    }

    // Test 6: Cancelar la descarga (para no esperar a que termine)
    console.log('\n6. Cancelling download...');
    await downloadManager.cancelDownload(sessionId);

    // Verificar que se canceló
    session = downloadManager.getDownloadStatus(sessionId);
    if (session) {
      console.log(`   Final status: ${session.status}`);
    }

    // Test 7: Estadísticas de limpieza
    console.log('\n7. Getting temp directory stats...');
    const tempStats = CleanupService.getTempDirStats();
    console.log(`   Total size: ${tempStats.totalSize} bytes`);
    console.log(`   Total files: ${tempStats.totalFiles}`);
    console.log(`   Total directories: ${tempStats.totalDirs}`);

    // Test 8: Ejecutar limpieza manual
    console.log('\n8. Running manual cleanup...');
    const cleanupResult = await CleanupService.cleanup();
    console.log(`   Files removed: ${cleanupResult.tempFilesRemoved}`);
    console.log(`   Directories removed: ${cleanupResult.tempDirsRemoved}`);
    console.log(`   Bytes freed: ${cleanupResult.bytesFreed}`);

    // Detener servicio de limpieza
    CleanupService.stop();

    console.log('\n🎉 Download Manager tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    CleanupService.stop();
    process.exit(1);
  }
}

// Ejecutar solo si este archivo es llamado directamente
if (require.main === module) {
  testDownloadManager();
}

export { testDownloadManager };