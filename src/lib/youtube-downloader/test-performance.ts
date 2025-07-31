import { RobustDownloader } from './robust-downloader';
import { AlternativeDownloader } from './alternative-downloader';
import { DownloadManager } from './download-manager';
import { debugLogger } from './debug-logger';
import { YOUTUBE_DOWNLOADER_CONFIG } from './config';

/**
 * Métricas de rendimiento
 */
interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  attempts: number;
  strategies: string[];
  errorRate: number;
  throughput?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

/**
 * Suite de tests de rendimiento para el sistema de descarga de YouTube
 */
export class YouTubePerformanceTest {
  private static metrics: PerformanceMetrics[] = [];
  
  private static readonly TEST_URLS = [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo - 19s
    'https://www.youtube.com/watch?v=9bZkp7q19f0', // PSY - GANGNAM STYLE
    'https://www.youtube.com/watch?v=kJQP7kiw5Fk', // Luis Fonsi - Despacito
  ];

  /**
   * Ejecuta todos los tests de rendimiento
   */
  static async runPerformanceTests(): Promise<void> {
    console.log('⚡ Starting YouTube Performance Tests...');
    debugLogger.info('PerformanceTest', 'Starting performance test suite');

    this.metrics = [];
    const startTime = Date.now();

    const tests = [
      { name: 'Video Info Extraction Speed', fn: this.testVideoInfoSpeed },
      { name: 'Strategy Effectiveness', fn: this.testStrategyEffectiveness },
      { name: 'Memory Usage Analysis', fn: this.testMemoryUsage },
      { name: 'Concurrent Operations', fn: this.testConcurrentOperations },
      { name: 'Error Recovery Speed', fn: this.testErrorRecoverySpeed },
      { name: 'Cache Performance', fn: this.testCachePerformance }
    ];

    for (const test of tests) {
      try {
        console.log(`\n⚡ Running: ${test.name}`);
        await test.fn();
        console.log(`✅ ${test.name} - Completed`);
      } catch (error) {
        console.error(`❌ ${test.name} - Failed:`, error);
        debugLogger.error('PerformanceTest', `Performance test failed: ${test.name}`, error as Error);
      }
    }

    const totalTime = Date.now() - startTime;
    this.generatePerformanceReport(totalTime);
  }

  /**
   * Test de velocidad de extracción de información de video
   */
  private static async testVideoInfoSpeed(): Promise<void> {
    const testUrl = this.TEST_URLS[0];
    const iterations = 3;
    const results: PerformanceMetrics[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const memoryBefore = process.memoryUsage();

      try {
        const { videoInfo, stats } = await RobustDownloader.getVideoInfoRobust(testUrl);
        
        const endTime = Date.now();
        const memoryAfter = process.memoryUsage();
        
        const metric: PerformanceMetrics = {
          operation: 'VideoInfoExtraction',
          startTime,
          endTime,
          duration: endTime - startTime,
          success: true,
          attempts: stats.totalAttempts,
          strategies: stats.strategiesUsed,
          errorRate: stats.errorsEncountered.length / stats.totalAttempts,
          memoryUsage: {
            rss: memoryAfter.rss - memoryBefore.rss,
            heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
            heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
            external: memoryAfter.external - memoryBefore.external,
            arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers
          }
        };

        results.push(metric);
        this.metrics.push(metric);

        console.log(`  Iteration ${i + 1}: ${metric.duration}ms, ${metric.attempts} attempts`);

      } catch (error) {
        const endTime = Date.now();
        
        const metric: PerformanceMetrics = {
          operation: 'VideoInfoExtraction',
          startTime,
          endTime,
          duration: endTime - startTime,
          success: false,
          attempts: 1,
          strategies: ['failed'],
          errorRate: 1
        };

        results.push(metric);
        this.metrics.push(metric);

        console.log(`  Iteration ${i + 1}: Failed in ${metric.duration}ms`);
      }

      // Delay entre iteraciones para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Calcular estadísticas
    const successful = results.filter(r => r.success);
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const avgAttempts = successful.reduce((sum, r) => sum + r.attempts, 0) / successful.length;
    const successRate = (successful.length / results.length) * 100;

    console.log(`📊 Video Info Speed Results:`);
    console.log(`  Average Duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Average Attempts: ${avgAttempts.toFixed(1)}`);
    console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
  }

  /**
   * Test de efectividad de estrategias
   */
  private static async testStrategyEffectiveness(): Promise<void> {
    const testUrl = this.TEST_URLS[0];
    const strategies = [
      'user_agent_rotation',
      'random_delays',
      'extended_timeout'
    ];

    const strategyResults: { [key: string]: PerformanceMetrics[] } = {};

    for (const strategy of strategies) {
      console.log(`  Testing strategy: ${strategy}`);
      strategyResults[strategy] = [];

      try {
        const startTime = Date.now();
        
        // Simular estrategia específica
        const { videoInfo, stats } = await RobustDownloader.getVideoInfoRobust(testUrl, {
          enableUserAgentRotation: strategy === 'user_agent_rotation',
          enableRandomDelays: strategy === 'random_delays',
          customRetryOptions: strategy === 'extended_timeout' ? { maxRetries: 1 } : undefined
        });

        const endTime = Date.now();
        
        const metric: PerformanceMetrics = {
          operation: `Strategy_${strategy}`,
          startTime,
          endTime,
          duration: endTime - startTime,
          success: true,
          attempts: stats.totalAttempts,
          strategies: stats.strategiesUsed,
          errorRate: stats.errorsEncountered.length / stats.totalAttempts
        };

        strategyResults[strategy].push(metric);
        this.metrics.push(metric);

        console.log(`    Success: ${metric.duration}ms, ${metric.attempts} attempts`);

      } catch (error) {
        console.log(`    Failed: ${(error as Error).message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Analizar efectividad
    console.log(`📊 Strategy Effectiveness:`);
    for (const [strategy, results] of Object.entries(strategyResults)) {
      const successful = results.filter(r => r.success);
      if (successful.length > 0) {
        const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        const avgAttempts = successful.reduce((sum, r) => sum + r.attempts, 0) / successful.length;
        console.log(`  ${strategy}: ${avgDuration.toFixed(0)}ms avg, ${avgAttempts.toFixed(1)} attempts avg`);
      } else {
        console.log(`  ${strategy}: No successful attempts`);
      }
    }
  }

  /**
   * Test de uso de memoria
   */
  private static async testMemoryUsage(): Promise<void> {
    const testUrl = this.TEST_URLS[0];
    
    // Forzar garbage collection si está disponible
    if (global.gc) {
      global.gc();
    }

    const memoryBefore = process.memoryUsage();
    console.log(`📊 Memory Before Test:`);
    console.log(`  RSS: ${(memoryBefore.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Used: ${(memoryBefore.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    try {
      // Ejecutar múltiples operaciones para medir uso de memoria
      const operations = [];
      for (let i = 0; i < 3; i++) {
        operations.push(RobustDownloader.getVideoInfoRobust(testUrl));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await Promise.allSettled(operations);

    } catch (error) {
      console.log('Some operations failed (expected in memory test)');
    }

    const memoryAfter = process.memoryUsage();
    console.log(`📊 Memory After Test:`);
    console.log(`  RSS: ${(memoryAfter.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Heap Used: ${(memoryAfter.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Memory Growth: ${((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024).toFixed(2)} MB`);

    const metric: PerformanceMetrics = {
      operation: 'MemoryUsage',
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      success: true,
      attempts: 1,
      strategies: ['memory_test'],
      errorRate: 0,
      memoryUsage: {
        rss: memoryAfter.rss - memoryBefore.rss,
        heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        external: memoryAfter.external - memoryBefore.external,
        arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers
      }
    };

    this.metrics.push(metric);
  }

  /**
   * Test de operaciones concurrentes
   */
  private static async testConcurrentOperations(): Promise<void> {
    const testUrl = this.TEST_URLS[0];
    const concurrency = 3;

    console.log(`Testing ${concurrency} concurrent operations...`);

    const startTime = Date.now();
    const operations = [];

    for (let i = 0; i < concurrency; i++) {
      operations.push(
        RobustDownloader.getVideoInfoRobust(testUrl)
          .then(result => ({ success: true, result }))
          .catch(error => ({ success: false, error }))
      );
    }

    const results = await Promise.all(operations);
    const endTime = Date.now();

    const successful = results.filter(r => r.success).length;
    const totalDuration = endTime - startTime;
    const throughput = successful / (totalDuration / 1000); // operations per second

    console.log(`📊 Concurrent Operations Results:`);
    console.log(`  Successful: ${successful}/${concurrency}`);
    console.log(`  Total Duration: ${totalDuration}ms`);
    console.log(`  Throughput: ${throughput.toFixed(2)} ops/sec`);

    const metric: PerformanceMetrics = {
      operation: 'ConcurrentOperations',
      startTime,
      endTime,
      duration: totalDuration,
      success: successful > 0,
      attempts: concurrency,
      strategies: ['concurrent'],
      errorRate: (concurrency - successful) / concurrency,
      throughput
    };

    this.metrics.push(metric);
  }

  /**
   * Test de velocidad de recuperación de errores
   */
  private static async testErrorRecoverySpeed(): Promise<void> {
    const invalidUrl = 'https://www.youtube.com/watch?v=invalid123';

    console.log('Testing error recovery speed...');

    const startTime = Date.now();

    try {
      await RobustDownloader.getVideoInfoRobust(invalidUrl);
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`📊 Error Recovery Speed: ${duration}ms`);

      const metric: PerformanceMetrics = {
        operation: 'ErrorRecovery',
        startTime,
        endTime,
        duration,
        success: false, // Expected failure
        attempts: 1,
        strategies: ['error_recovery'],
        errorRate: 1
      };

      this.metrics.push(metric);
    }
  }

  /**
   * Test de rendimiento de cache
   */
  private static async testCachePerformance(): Promise<void> {
    console.log('Testing cache performance (simulated)...');

    // Simular operaciones de cache
    const operations = ['get', 'set', 'delete'];
    const cacheMetrics: PerformanceMetrics[] = [];

    for (const operation of operations) {
      const startTime = Date.now();
      
      // Simular operación de cache
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      const endTime = Date.now();
      
      const metric: PerformanceMetrics = {
        operation: `Cache_${operation}`,
        startTime,
        endTime,
        duration: endTime - startTime,
        success: true,
        attempts: 1,
        strategies: ['cache'],
        errorRate: 0
      };

      cacheMetrics.push(metric);
      this.metrics.push(metric);
    }

    const avgCacheDuration = cacheMetrics.reduce((sum, m) => sum + m.duration, 0) / cacheMetrics.length;
    console.log(`📊 Average Cache Operation: ${avgCacheDuration.toFixed(2)}ms`);
  }

  /**
   * Genera reporte de rendimiento
   */
  private static generatePerformanceReport(totalTime: number): void {
    console.log('\n⚡ PERFORMANCE TEST REPORT');
    console.log('=' .repeat(60));

    // Agrupar métricas por operación
    const operationGroups: { [key: string]: PerformanceMetrics[] } = {};
    
    this.metrics.forEach(metric => {
      if (!operationGroups[metric.operation]) {
        operationGroups[metric.operation] = [];
      }
      operationGroups[metric.operation].push(metric);
    });

    // Estadísticas por operación
    for (const [operation, metrics] of Object.entries(operationGroups)) {
      const successful = metrics.filter(m => m.success);
      const avgDuration = successful.length > 0 
        ? successful.reduce((sum, m) => sum + m.duration, 0) / successful.length 
        : 0;
      const successRate = (successful.length / metrics.length) * 100;
      const avgAttempts = successful.length > 0
        ? successful.reduce((sum, m) => sum + m.attempts, 0) / successful.length
        : 0;

      console.log(`\n📊 ${operation}:`);
      console.log(`  Tests: ${metrics.length}`);
      console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
      console.log(`  Avg Duration: ${avgDuration.toFixed(0)}ms`);
      console.log(`  Avg Attempts: ${avgAttempts.toFixed(1)}`);

      if (successful.length > 0) {
        const minDuration = Math.min(...successful.map(m => m.duration));
        const maxDuration = Math.max(...successful.map(m => m.duration));
        console.log(`  Duration Range: ${minDuration}ms - ${maxDuration}ms`);
      }
    }

    // Estadísticas generales
    const totalTests = this.metrics.length;
    const totalSuccessful = this.metrics.filter(m => m.success).length;
    const overallSuccessRate = (totalSuccessful / totalTests) * 100;
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalTests;

    console.log('\n📈 OVERALL STATISTICS:');
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`  Average Duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Total Test Time: ${(totalTime / 1000).toFixed(2)}s`);

    // Recomendaciones de rendimiento
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
    
    if (overallSuccessRate < 80) {
      console.log('  • Consider implementing additional fallback strategies');
    }
    
    if (avgDuration > 10000) {
      console.log('  • Operations are taking longer than expected, consider optimization');
    }
    
    const memoryMetrics = this.metrics.filter(m => m.memoryUsage);
    if (memoryMetrics.length > 0) {
      const avgMemoryGrowth = memoryMetrics.reduce((sum, m) => sum + (m.memoryUsage?.heapUsed || 0), 0) / memoryMetrics.length;
      if (avgMemoryGrowth > 50 * 1024 * 1024) { // 50MB
        console.log('  • High memory usage detected, consider implementing memory optimization');
      }
    }

    console.log('=' .repeat(60));

    debugLogger.info('PerformanceTest', 'Performance test suite completed', {
      totalTests,
      overallSuccessRate,
      avgDuration,
      totalTime
    });
  }

  /**
   * Obtiene métricas de rendimiento actuales
   */
  static getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Limpia métricas almacenadas
   */
  static clearMetrics(): void {
    this.metrics = [];
  }
}

// Función de conveniencia para ejecutar desde consola
export async function runYouTubePerformanceTests(): Promise<void> {
  await YouTubePerformanceTest.runPerformanceTests();
}

// Función para obtener métricas actuales
export function getPerformanceMetrics(): PerformanceMetrics[] {
  return YouTubePerformanceTest.getMetrics();
}