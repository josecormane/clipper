import { YouTubeWrapper } from './youtube-wrapper';
import path from 'path';
import fs from 'fs';

/**
 * Test simple de descarga
 */
async function testDownload() {
  console.log('🧪 Testing YouTube download...');
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const outputDir = path.join(process.cwd(), 'temp-test');
  
  // Crear directorio temporal
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'test-video.mp4');
  
  try {
    console.log('📥 Starting download...');
    console.log(`📁 Output: ${outputPath}`);
    
    const filePath = await YouTubeWrapper.downloadVideo(
      testUrl,
      outputPath,
      { quality: 'low' }, // Usar calidad baja para test rápido
      (progress) => {
        if (progress.percentage) {
          console.log(`📊 Progress: ${progress.percentage.toFixed(1)}%`);
        }
      }
    );
    
    console.log(`✅ Download completed: ${filePath}`);
    
    // Verificar que el archivo existe
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`📊 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      throw new Error('Downloaded file not found');
    }
    
    // Limpiar archivo de test
    try {
      fs.unlinkSync(filePath);
      fs.rmdirSync(outputDir);
      console.log('🗑️ Cleaned up test files');
    } catch (error) {
      console.log('⚠️ Could not clean up test files:', error);
    }
    
    console.log('🎉 Download test passed!');
    
  } catch (error) {
    console.error('❌ Download test failed:', error);
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testDownload()
    .then(() => {
      console.log('✅ Download test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Download test failed:', error);
      process.exit(1);
    });
}

export { testDownload };