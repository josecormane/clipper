import os from 'os';
import fs from 'fs';
import { advancedConfig, AdvancedConfig } from './advanced-config';
import { debugLogger } from './debug-logger';
import { DownloadManager } from './download-manager';

/**
 * Métricas del sistema
 */
interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  disk: {
    available: number;
    used: number;
    total: number;
    usagePercent: number;
  };
  network: {
    latency: number;
    bandwidth: number;
  };
}

/**
 * Recomendaciones de optimización
 */
interface OptimizationRecommendation {
  category: 'performance' | 'quality' | 'storage' | 'network';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  configChanges?: Partial<AdvancedConfig>;
  estimatedImpact: string;
}

/**
 * Optimizador de rendimiento para el sistema de descarga de YouTube
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private metrics: SystemMetrics | null = null;
  private lastOptimization: Date | null = null;
  private optimizationHistory: OptimizationRecommendation[] = [];

  private constructor() {}

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Recopila métricas del sistema
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const startTime = Date.now();

    try {
      // Métricas de CPU
      const cpus = os.cpus();
      const loadAvg = os.loadavg();
      
      // Calcular uso de CPU (simplificado)
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });
      
      const cpuUsage = 100 - (totalIdle / totalTick * 100);

      // Métricas de memoria
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      // Métricas de disco (simplificado)
      let diskMetrics = {
        available: 0,
        used: 0,
        total: 0,
        usagePercent: 0
      };

      try {
        const config = advancedConfig.getConfig();
        const stats = fs.statSync(config.storage.tempDirectory);
        // En un sistema real, usaríamos statvfs o similar para obtener espacio en disco
        diskMetrics = {
          available: 10 * 1024 * 1024 * 1024, // 10GB simulado
          used: 2 * 1024 * 1024 * 1024, // 2GB simulado
          total: 12 * 1024 * 1024 * 1024, // 12GB simulado
          usagePercent: (2 / 12) * 100
        };
      } catch (error) {
        debugLogger.warn('PerformanceOptimizer', 'Could not get disk metrics', { error: (error as Error).message });
      }

      // Métricas de red (simplificado)
      const networkLatency = await this.measureNetworkLatency();
      const networkBandwidth = await this.estimateBandwidth();

      this.metrics = {
        cpu: {
          usage: cpuUsage,
          loadAverage: loadAvg,
          cores: cpus.length
        },
        memory: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          usagePercent: memoryUsagePercent
        },
        disk: diskMetrics,
        network: {
          latency: networkLatency,
          bandwidth: networkBandwidth
        }
      };

      const collectionTime = Date.now() - startTime;
      debugLogger.info('PerformanceOptimizer', 'System metrics collected', {
        collectionTime,
        cpuUsage: cpuUsage.toFixed(2),
        memoryUsage: memoryUsagePercent.toFixed(2),
        diskUsage: diskMetrics.usagePercent.toFixed(2)
      });

      return this.metrics;

    } catch (error) {
      debugLogger.error('PerformanceOptimizer', 'Failed to collect system metrics', error as Error);
      throw error;
    }
  }

  /**
   * Mide latencia de red
   */
  private async measureNetworkLatency(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Ping a YouTube para medir latencia
      const response = await fetch('https://www.youtube.com/favicon.ico', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        return Date.now() - startTime;
      }
    } catch (error) {
      debugLogger.warn('PerformanceOptimizer', 'Network latency measurement failed', { error: (error as Error).message });
    }
    
    return 1000; // Default 1 segundo si falla
  }

  /**
   * Estima ancho de banda
   */
  private async estimateBandwidth(): Promise<number> {
    try {
      const startTime = Date.now();
      const testUrl = 'https://www.youtube.com/favicon.ico';
      
      const response = await fetch(testUrl, {
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = await response.arrayBuffer();
        const duration = (Date.now() - startTime) / 1000; // segundos
        const sizeBytes = data.byteLength;
        const bandwidthBps = sizeBytes / duration; // bytes por segundo
        
        return bandwidthBps * 8; // bits por segundo
      }
    } catch (error) {
      debugLogger.warn('PerformanceOptimizer', 'Bandwidth estimation failed', { error: (error as Error).message });
    }
    
    return 1000000; // Default 1 Mbps si falla
  }

  /**
   * Analiza el rendimiento actual y genera recomendaciones
   */
  async analyzePerformance(): Promise<OptimizationRecommendation[]> {
    if (!this.metrics) {
      await this.collectSystemMetrics();
    }

    const recommendations: OptimizationRecommendation[] = [];
    const config = advancedConfig.getConfig();
    const downloadManager = DownloadManager.getInstance();
    const activeSessions = downloadManager.getAllActiveSessions();

    // Análisis de CPU
    if (this.metrics!.cpu.usage > 80) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'High CPU Usage Detected',
        description: `CPU usage is at ${this.metrics!.cpu.usage.toFixed(1)}%. This may slow down downloads.`,
        action: 'Reduce concurrent downloads and enable throttling',
        configChanges: {
          performance: {
            ...config.performance,
            maxConcurrentDownloads: Math.max(1, Math.floor(config.performance.maxConcurrentDownloads / 2))
          }
        },
        estimatedImpact: 'Reduce CPU usage by 30-50%'
      });
    }

    // Análisis de memoria
    if (this.metrics!.memory.usagePercent > 85) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'High Memory Usage Detected',
        description: `Memory usage is at ${this.metrics!.memory.usagePercent.toFixed(1)}%. System may become unstable.`,
        action: 'Reduce memory limits and concurrent operations',
        configChanges: {
          performance: {
            ...config.performance,
            memoryLimitMB: Math.floor(config.performance.memoryLimitMB * 0.7),
            maxConcurrentInfoExtractions: Math.max(2, Math.floor(config.performance.maxConcurrentInfoExtractions / 2))
          }
        },
        estimatedImpact: 'Reduce memory usage by 20-30%'
      });
    }

    // Análisis de disco
    if (this.metrics!.disk.usagePercent > 90) {
      recommendations.push({
        category: 'storage',
        priority: 'high',
        title: 'Low Disk Space',
        description: `Disk usage is at ${this.metrics!.disk.usagePercent.toFixed(1)}%. Downloads may fail.`,
        action: 'Enable compression and cleanup old files',
        configChanges: {
          storage: {
            ...config.storage,
            enableCompression: true,
            compressionLevel: 9
          }
        },
        estimatedImpact: 'Save 30-50% disk space'
      });
    }

    // Análisis de red
    if (this.metrics!.network.latency > 2000) {
      recommendations.push({
        category: 'network',
        priority: 'medium',
        title: 'High Network Latency',
        description: `Network latency is ${this.metrics!.network.latency}ms. Downloads may be slow.`,
        action: 'Increase timeouts and reduce concurrent downloads',
        configChanges: {
          performance: {
            ...config.performance,
            networkTimeoutMs: Math.max(config.performance.networkTimeoutMs, this.metrics!.network.latency * 3),
            maxConcurrentDownloads: Math.max(1, config.performance.maxConcurrentDownloads - 1)
          }
        },
        estimatedImpact: 'Improve download reliability by 40-60%'
      });
    }

    // Análisis de ancho de banda
    if (this.metrics!.network.bandwidth < 1000000) { // Menos de 1 Mbps
      recommendations.push({
        category: 'quality',
        priority: 'medium',
        title: 'Low Bandwidth Detected',
        description: `Bandwidth is ${(this.metrics!.network.bandwidth / 1000000).toFixed(1)} Mbps. Consider lower quality.`,
        action: 'Reduce default quality and enable adaptive streaming',
        configChanges: {
          quality: {
            ...config.quality,
            defaultQuality: 'medium',
            maxResolution: 720
          },
          experimental: {
            ...config.experimental,
            enableAdaptiveQuality: true,
            enableBandwidthOptimization: true
          }
        },
        estimatedImpact: 'Reduce download time by 50-70%'
      });
    }

    // Análisis de descargas activas
    if (activeSessions.length > config.performance.maxConcurrentDownloads) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: 'Too Many Active Downloads',
        description: `${activeSessions.length} active downloads exceed the limit of ${config.performance.maxConcurrentDownloads}.`,
        action: 'Increase queue size or reduce concurrent limit',
        configChanges: {
          performance: {
            ...config.performance,
            downloadQueueSize: Math.max(config.performance.downloadQueueSize, activeSessions.length + 5)
          }
        },
        estimatedImpact: 'Improve download management efficiency'
      });
    }

    // Análisis de configuración anti-bloqueo
    if (!config.antiBlocking.enableUserAgentRotation || !config.antiBlocking.enableRandomDelays) {
      recommendations.push({
        category: 'network',
        priority: 'low',
        title: 'Anti-blocking Features Disabled',
        description: 'Some anti-blocking features are disabled, which may reduce success rates.',
        action: 'Enable user agent rotation and random delays',
        configChanges: {
          antiBlocking: {
            ...config.antiBlocking,
            enableUserAgentRotation: true,
            enableRandomDelays: true,
            enableAlternativeExtractors: true
          }
        },
        estimatedImpact: 'Improve success rate by 20-30%'
      });
    }

    this.optimizationHistory.push(...recommendations);
    this.lastOptimization = new Date();

    debugLogger.info('PerformanceOptimizer', 'Performance analysis completed', {
      recommendationsCount: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'high').length,
      mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
      lowPriority: recommendations.filter(r => r.priority === 'low').length
    });

    return recommendations;
  }

  /**
   * Aplica recomendaciones de optimización automáticamente
   */
  async applyOptimizations(recommendations: OptimizationRecommendation[], autoApply: boolean = false): Promise<void> {
    if (!autoApply) {
      debugLogger.info('PerformanceOptimizer', 'Auto-apply disabled, skipping optimization application');
      return;
    }

    let appliedCount = 0;

    for (const recommendation of recommendations) {
      try {
        if (recommendation.configChanges && recommendation.priority === 'high') {
          debugLogger.info('PerformanceOptimizer', `Applying optimization: ${recommendation.title}`);
          
          advancedConfig.updateConfig(recommendation.configChanges);
          appliedCount++;
          
          debugLogger.info('PerformanceOptimizer', `Applied optimization: ${recommendation.title}`, {
            category: recommendation.category,
            estimatedImpact: recommendation.estimatedImpact
          });
        }
      } catch (error) {
        debugLogger.error('PerformanceOptimizer', `Failed to apply optimization: ${recommendation.title}`, error as Error);
      }
    }

    if (appliedCount > 0) {
      await advancedConfig.saveConfig();
      debugLogger.info('PerformanceOptimizer', `Applied ${appliedCount} optimizations and saved configuration`);
    }
  }

  /**
   * Ejecuta optimización completa del sistema
   */
  async optimizeSystem(autoApply: boolean = false): Promise<{
    metrics: SystemMetrics;
    recommendations: OptimizationRecommendation[];
    appliedOptimizations: number;
  }> {
    console.log('🔧 Starting system optimization...');
    
    const startTime = Date.now();
    
    try {
      // Recopilar métricas
      const metrics = await this.collectSystemMetrics();
      
      // Analizar rendimiento
      const recommendations = await this.analyzePerformance();
      
      // Aplicar optimizaciones si está habilitado
      let appliedOptimizations = 0;
      if (autoApply) {
        const highPriorityRecommendations = recommendations.filter(r => r.priority === 'high');
        await this.applyOptimizations(highPriorityRecommendations, true);
        appliedOptimizations = highPriorityRecommendations.filter(r => r.configChanges).length;
      }

      const optimizationTime = Date.now() - startTime;
      
      console.log(`✅ System optimization completed in ${optimizationTime}ms`);
      console.log(`📊 Found ${recommendations.length} recommendations`);
      if (appliedOptimizations > 0) {
        console.log(`🔧 Applied ${appliedOptimizations} high-priority optimizations`);
      }

      debugLogger.info('PerformanceOptimizer', 'System optimization completed', {
        optimizationTime,
        recommendationsCount: recommendations.length,
        appliedOptimizations,
        autoApply
      });

      return {
        metrics,
        recommendations,
        appliedOptimizations
      };

    } catch (error) {
      debugLogger.error('PerformanceOptimizer', 'System optimization failed', error as Error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de optimización
   */
  getOptimizationStats(): {
    lastOptimization: Date | null;
    totalRecommendations: number;
    recommendationsByCategory: { [key: string]: number };
    recommendationsByPriority: { [key: string]: number };
    currentMetrics: SystemMetrics | null;
  } {
    const recommendationsByCategory: { [key: string]: number } = {};
    const recommendationsByPriority: { [key: string]: number } = {};

    this.optimizationHistory.forEach(rec => {
      recommendationsByCategory[rec.category] = (recommendationsByCategory[rec.category] || 0) + 1;
      recommendationsByPriority[rec.priority] = (recommendationsByPriority[rec.priority] || 0) + 1;
    });

    return {
      lastOptimization: this.lastOptimization,
      totalRecommendations: this.optimizationHistory.length,
      recommendationsByCategory,
      recommendationsByPriority,
      currentMetrics: this.metrics
    };
  }

  /**
   * Limpia historial de optimizaciones
   */
  clearOptimizationHistory(): void {
    this.optimizationHistory = [];
    this.lastOptimization = null;
    debugLogger.info('PerformanceOptimizer', 'Optimization history cleared');
  }
}

// Instancia singleton
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Funciones de conveniencia
export async function optimizeYouTubeDownloader(autoApply: boolean = false) {
  return await performanceOptimizer.optimizeSystem(autoApply);
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  return await performanceOptimizer.collectSystemMetrics();
}

export async function getOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
  return await performanceOptimizer.analyzePerformance();
}