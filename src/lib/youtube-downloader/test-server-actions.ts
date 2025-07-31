/**
 * Script de prueba para las server actions de YouTube
 */

// Importar las server actions
import {
  getYouTubeVideoInfoLocal,
  downloadYouTubeVideoLocal,
  getYouTubeDownloadStatusLocal,
  cancelYouTubeDownloadLocal,
  processYouTubeDownloadLocal,
  getAllYouTubeProjectsLocal,
  getYouTubeDownloadStatsLocal,
  cleanupYouTubeDownloadsLocal
} from '../local-actions';

async function testServerActions() {
  console.log('🧪 Testing YouTube Server Actions...\n');

  try {
    const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo"

    // Test 1: Obtener información del video
    console.log('1. Testing getYouTubeVideoInfoLocal...');
    const videoInfoResult = await getYouTubeVideoInfoLocal({ url: testUrl });
    
    if (videoInfoResult.error) {
      console.log(`   ⚠️ Expected error (video might already exist): ${videoInfoResult.error}`);
      if (videoInfoResult.existingProject) {
        console.log(`   📁 Existing project: ${videoInfoResult.existingProject.name}`);
      }
    } else {
      console.log('   ✅ Video info retrieved successfully:');
      console.log(`     Title: ${videoInfoResult.videoInfo?.title}`);
      console.log(`     Uploader: ${videoInfoResult.videoInfo?.uploader}`);
      console.log(`     Duration: ${videoInfoResult.videoInfo?.duration}s`);
      console.log(`     Quality options: ${videoInfoResult.qualityOptions?.length}`);
      console.log(`     Stats: ${videoInfoResult.stats?.totalAttempts} attempts, ${videoInfoResult.stats?.totalTime}ms`);
    }

    // Test 2: Obtener todos los proyectos de YouTube
    console.log('\n2. Testing getAllYouTubeProjectsLocal...');
    const allProjectsResult = await getAllYouTubeProjectsLocal();
    
    if (allProjectsResult.error) {
      console.error(`   ❌ Error: ${allProjectsResult.error}`);
    } else {
      console.log(`   ✅ Found ${allProjectsResult.projects?.length} YouTube projects:`);
      allProjectsResult.projects?.forEach(project => {
        console.log(`     - ${project.name} (${project.youtubeMetadata?.videoId})`);
        console.log(`       Source: ${project.source}, Duration: ${project.duration}s`);
        console.log(`       Created: ${new Date(project.createdAt).toLocaleDateString()}`);
      });
    }

    // Test 3: Obtener estadísticas de descargas
    console.log('\n3. Testing getYouTubeDownloadStatsLocal...');
    const statsResult = await getYouTubeDownloadStatsLocal();
    
    if (statsResult.error) {
      console.error(`   ❌ Error: ${statsResult.error}`);
    } else {
      console.log('   ✅ Download statistics:');
      console.log(`     Total sessions: ${statsResult.stats?.totalSessions}`);
      console.log(`     Active sessions: ${statsResult.stats?.activeSessions}`);
      console.log(`     Completed sessions: ${statsResult.stats?.completedSessions}`);
      console.log(`     Failed sessions: ${statsResult.stats?.failedSessions}`);
      
      if (statsResult.activeSessions && statsResult.activeSessions.length > 0) {
        console.log('   Active sessions:');
        statsResult.activeSessions.forEach(session => {
          console.log(`     - ${session.id}: ${session.status} (${session.url})`);
        });
      }
    }

    // Test 4: Limpiar descargas
    console.log('\n4. Testing cleanupYouTubeDownloadsLocal...');
    const cleanupResult = await cleanupYouTubeDownloadsLocal();
    
    if (cleanupResult.error) {
      console.error(`   ❌ Error: ${cleanupResult.error}`);
    } else {
      console.log('   ✅ Cleanup completed:');
      console.log(`     Files removed: ${cleanupResult.result?.tempFilesRemoved}`);
      console.log(`     Directories removed: ${cleanupResult.result?.tempDirsRemoved}`);
      console.log(`     Bytes freed: ${cleanupResult.result?.bytesFreed}`);
    }

    // Test 5: Probar descarga (solo iniciar, no completar)
    console.log('\n5. Testing downloadYouTubeVideoLocal (start only)...');
    
    // Usar una URL diferente para evitar duplicados
    const testDownloadUrl = 'https://www.youtube.com/watch?v=9bZkp7q19f0'; // Gangnam Style (video público conocido)
    
    const downloadResult = await downloadYouTubeVideoLocal({ 
      url: testDownloadUrl,
      quality: 'low', // Usar calidad baja para prueba
      maxFileSize: 5 * 1024 * 1024 // 5MB máximo
    });
    
    if (downloadResult.error) {
      console.log(`   ⚠️ Download error (expected if video exists): ${downloadResult.error}`);
    } else {
      console.log('   ✅ Download started successfully:');
      console.log(`     Session ID: ${downloadResult.sessionId}`);
      console.log(`     Video: ${downloadResult.videoInfo?.title}`);
      console.log(`     Uploader: ${downloadResult.videoInfo?.uploader}`);
      
      // Test 6: Verificar estado de descarga
      console.log('\n6. Testing getYouTubeDownloadStatusLocal...');
      const statusResult = await getYouTubeDownloadStatusLocal({ 
        sessionId: downloadResult.sessionId! 
      });
      
      if (statusResult.error) {
        console.error(`   ❌ Error: ${statusResult.error}`);
      } else {
        console.log('   ✅ Download status retrieved:');
        console.log(`     Status: ${statusResult.session?.status}`);
        console.log(`     Progress: ${statusResult.session?.progress.percentage?.toFixed(1)}%`);
        console.log(`     URL: ${statusResult.session?.url}`);
      }
      
      // Test 7: Cancelar descarga
      console.log('\n7. Testing cancelYouTubeDownloadLocal...');
      const cancelResult = await cancelYouTubeDownloadLocal({ 
        sessionId: downloadResult.sessionId! 
      });
      
      if (cancelResult.error) {
        console.error(`   ❌ Error: ${cancelResult.error}`);
      } else {
        console.log('   ✅ Download cancelled successfully');
      }
    }

    console.log('\n🎉 YouTube Server Actions tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Ejecutar solo si este archivo es llamado directamente
if (require.main === module) {
  testServerActions();
}

export { testServerActions };