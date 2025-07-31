import { getYouTubeVideoInfo, downloadYouTubeVideo, validateYouTubeUrl } from './youtube-actions';

/**
 * Test de las server actions
 */
async function testActions() {
  console.log('🧪 Testing YouTube server actions...');
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  try {
    // Test 1: Validar URL
    console.log('🔍 Testing URL validation...');
    const validationResult = await validateYouTubeUrl(testUrl);
    console.log('Validation result:', validationResult);
    
    if (!validationResult.success || !validationResult.data.isValid) {
      throw new Error('URL validation failed');
    }
    
    // Test 2: Obtener información del video
    console.log('📡 Testing video info extraction...');
    const infoResult = await getYouTubeVideoInfo(testUrl);
    console.log('Info result:', {
      success: infoResult.success,
      title: infoResult.success ? infoResult.data.title : 'N/A',
      uploader: infoResult.success ? infoResult.data.uploader : 'N/A',
      duration: infoResult.success ? infoResult.data.duration : 'N/A'
    });
    
    if (!infoResult.success) {
      throw new Error(`Video info failed: ${infoResult.error}`);
    }
    
    // Test 3: Descargar video (calidad baja para test rápido)
    console.log('📥 Testing video download...');
    const downloadResult = await downloadYouTubeVideo(testUrl, { 
      quality: 'low',
      createProject: true 
    });
    
    console.log('Download result:', {
      success: downloadResult.success,
      fileSize: downloadResult.success ? downloadResult.data.fileSize : 'N/A',
      projectId: downloadResult.success ? downloadResult.data.projectId : 'N/A',
      error: downloadResult.success ? null : downloadResult.error
    });
    
    if (!downloadResult.success) {
      throw new Error(`Download failed: ${downloadResult.error}`);
    }
    
    console.log('🎉 All server action tests passed!');
    
  } catch (error) {
    console.error('❌ Server action tests failed:', error);
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testActions()
    .then(() => {
      console.log('✅ Server action tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Server action tests failed:', error);
      process.exit(1);
    });
}

export { testActions };