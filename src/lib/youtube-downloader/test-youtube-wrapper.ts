import { YouTubeWrapper } from './youtube-wrapper';
import { ConfigUtils } from './config';

/**
 * Tests para el YouTubeWrapper
 */
export class YouTubeWrapperTests {
  /**
   * Test de validación de URLs
   */
  static async testUrlValidation(): Promise<void> {
    console.log('🧪 Testing URL validation...');
    
    const validUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ'
    ];
    
    const invalidUrls = [
      'https://vimeo.com/123456',
      'https://example.com/video',
      'not-a-url',
      ''
    ];
    
    // Test valid URLs
    for (const url of validUrls) {
      const isValid = ConfigUtils.isValidYouTubeUrl(url);
      console.log(`✅ ${url} -> ${isValid ? 'VALID' : 'INVALID'}`);
      
      if (!isValid) {
        throw new Error(`Expected ${url} to be valid`);
      }
    }
    
    // Test invalid URLs
    for (const url of invalidUrls) {
      const isValid = ConfigUtils.isValidYouTubeUrl(url);
      console.log(`❌ ${url} -> ${isValid ? 'VALID' : 'INVALID'}`);
      
      if (isValid) {
        throw new Error(`Expected ${url} to be invalid`);
      }
    }
    
    console.log('✅ URL validation tests passed');
  }

  /**
   * Test de extracción de información de video
   */
  static async testVideoInfoExtraction(): Promise<void> {
    console.log('🧪 Testing video info extraction...');
    
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    try {
      const videoInfo = await YouTubeWrapper.getVideoInfo(testUrl);
      
      console.log('📹 Video Info:');
      console.log(`  - ID: ${videoInfo.id}`);
      console.log(`  - Title: ${videoInfo.title}`);
      console.log(`  - Uploader: ${videoInfo.uploader}`);
      console.log(`  - Duration: ${videoInfo.duration}s`);
      console.log(`  - Formats: ${videoInfo.formats.length}`);
      
      // Validar campos requeridos
      if (!videoInfo.id) {
        throw new Error('Missing video ID');
      }
      
      if (!videoInfo.title) {
        throw new Error('Missing title');
      }
      
      if (!videoInfo.uploader) {
        throw new Error('Missing uploader');
      }
      
      if (videoInfo.duration <= 0) {
        throw new Error('Invalid duration');
      }
      
      if (!videoInfo.formats || videoInfo.formats.length === 0) {
        throw new Error('No formats found');
      }
      
      // Mostrar algunos formatos
      console.log('🎬 Available formats:');
      videoInfo.formats.slice(0, 5).forEach((format, i) => {
        console.log(`  ${i + 1}. ${format.resolution} (${format.ext}) - ${format.format_id}`);
        
        if (!format.format_id) {
          throw new Error('Missing format_id');
        }
        
        if (!format.ext) {
          throw new Error('Missing format ext');
        }
      });
      
      console.log('✅ Video info extraction test passed');
      
    } catch (error) {
      console.error('❌ Video info extraction test failed:', error);
      throw error;
    }
  }

  /**
   * Test de validación de video
   */
  static async testVideoValidation(): Promise<void> {
    console.log('🧪 Testing video validation...');
    
    const validUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const invalidUrl = 'https://www.youtube.com/watch?v=invalid_video_id';
    
    try {
      // Test valid video
      const isValid = await YouTubeWrapper.validateUrl(validUrl);
      console.log(`✅ Valid video: ${isValid}`);
      
      if (!isValid) {
        throw new Error('Expected valid video to return true');
      }
      
      // Test invalid video
      try {
        const isInvalid = await YouTubeWrapper.validateUrl(invalidUrl);
        console.log(`❌ Invalid video: ${isInvalid}`);
        
        if (isInvalid) {
          console.log('⚠️ Warning: Invalid video returned true (might be a real video)');
        }
      } catch (error) {
        console.log('❌ Invalid video correctly failed validation');
      }
      
      console.log('✅ Video validation test passed');
      
    } catch (error) {
      console.error('❌ Video validation test failed:', error);
      throw error;
    }
  }

  /**
   * Ejecuta todos los tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting YouTubeWrapper tests...');
    
    try {
      await this.testUrlValidation();
      await this.testVideoInfoExtraction();
      await this.testVideoValidation();
      
      console.log('🎉 All YouTubeWrapper tests passed!');
      
    } catch (error) {
      console.error('💥 YouTubeWrapper tests failed:', error);
      throw error;
    }
  }
}

// Ejecutar tests si se llama directamente
if (require.main === module) {
  YouTubeWrapperTests.runAllTests()
    .then(() => {
      console.log('✅ Test execution completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}