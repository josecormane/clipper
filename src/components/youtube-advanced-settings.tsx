'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Download, 
  HardDrive, 
  Wifi, 
  Shield, 
  Bell,
  Zap,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

// Simulamos la importación de la configuración avanzada
interface AdvancedConfig {
  performance: {
    maxConcurrentDownloads: number;
    maxConcurrentInfoExtractions: number;
    downloadQueueSize: number;
    memoryLimitMB: number;
    diskSpaceLimitGB: number;
    networkTimeoutMs: number;
    retryDelayMultiplier: number;
  };
  quality: {
    defaultQuality: 'highest' | 'high' | 'medium' | 'low';
    maxResolution: number;
    preferredFormats: string[];
    audioQuality: 'best' | 'good' | 'acceptable';
    enableHDR: boolean;
    enable60fps: boolean;
  };
  antiBlocking: {
    enableUserAgentRotation: boolean;
    enableRandomDelays: boolean;
    enableProxyRotation: boolean;
    enableCookieManagement: boolean;
    minDelayMs: number;
    maxDelayMs: number;
    maxRetriesPerStrategy: number;
    enableAlternativeExtractors: boolean;
    enableMobileSimulation: boolean;
  };
  storage: {
    tempDirectory: string;
    finalDirectory: string;
    enableCompression: boolean;
    compressionLevel: number;
    enableDuplicateDetection: boolean;
    enableMetadataExtraction: boolean;
    enableThumbnailDownload: boolean;
    enableSubtitleDownload: boolean;
  };
  logging: {
    enableDebugLogging: boolean;
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    enableFileLogging: boolean;
    maxLogFileSizeMB: number;
    maxLogFiles: number;
    enablePerformanceLogging: boolean;
  };
  notifications: {
    enableDesktopNotifications: boolean;
    enableSoundNotifications: boolean;
    enableProgressNotifications: boolean;
    notificationDurationMs: number;
    enableErrorNotifications: boolean;
  };
  experimental: {
    enableMachineLearning: boolean;
    enablePredictiveRetries: boolean;
    enableAdaptiveQuality: boolean;
    enableBandwidthOptimization: boolean;
    enableCDNFallback: boolean;
  };
}

interface YouTubeAdvancedSettingsProps {
  onClose?: () => void;
  onSave?: (config: AdvancedConfig) => void;
}

const DEFAULT_CONFIG: AdvancedConfig = {
  performance: {
    maxConcurrentDownloads: 3,
    maxConcurrentInfoExtractions: 5,
    downloadQueueSize: 10,
    memoryLimitMB: 1024,
    diskSpaceLimitGB: 10,
    networkTimeoutMs: 120000,
    retryDelayMultiplier: 2
  },
  quality: {
    defaultQuality: 'high',
    maxResolution: 1080,
    preferredFormats: ['mp4', 'webm', 'mkv'],
    audioQuality: 'best',
    enableHDR: false,
    enable60fps: true
  },
  antiBlocking: {
    enableUserAgentRotation: true,
    enableRandomDelays: true,
    enableProxyRotation: false,
    enableCookieManagement: true,
    minDelayMs: 1000,
    maxDelayMs: 8000,
    maxRetriesPerStrategy: 4,
    enableAlternativeExtractors: true,
    enableMobileSimulation: true
  },
  storage: {
    tempDirectory: '/tmp/youtube-downloads',
    finalDirectory: './local-storage/videos',
    enableCompression: false,
    compressionLevel: 6,
    enableDuplicateDetection: true,
    enableMetadataExtraction: true,
    enableThumbnailDownload: true,
    enableSubtitleDownload: false
  },
  logging: {
    enableDebugLogging: true,
    logLevel: 'INFO',
    enableFileLogging: true,
    maxLogFileSizeMB: 10,
    maxLogFiles: 5,
    enablePerformanceLogging: true
  },
  notifications: {
    enableDesktopNotifications: false,
    enableSoundNotifications: false,
    enableProgressNotifications: true,
    notificationDurationMs: 5000,
    enableErrorNotifications: true
  },
  experimental: {
    enableMachineLearning: false,
    enablePredictiveRetries: false,
    enableAdaptiveQuality: false,
    enableBandwidthOptimization: false,
    enableCDNFallback: false
  }
};

export function YouTubeAdvancedSettings({ onClose, onSave }: YouTubeAdvancedSettingsProps) {
  const [config, setConfig] = useState<AdvancedConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState('performance');
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    // En una implementación real, cargaríamos la configuración desde el servidor
    // loadAdvancedConfig().then(setConfig);
  }, []);

  const updateConfig = (section: keyof AdvancedConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const validateConfig = (): string[] => {
    const errors: string[] = [];

    if (config.performance.maxConcurrentDownloads < 1 || config.performance.maxConcurrentDownloads > 10) {
      errors.push('Max concurrent downloads must be between 1 and 10');
    }

    if (config.performance.memoryLimitMB < 256) {
      errors.push('Memory limit must be at least 256MB');
    }

    if (config.antiBlocking.minDelayMs >= config.antiBlocking.maxDelayMs) {
      errors.push('Min delay must be less than max delay');
    }

    if (config.antiBlocking.maxRetriesPerStrategy < 1 || config.antiBlocking.maxRetriesPerStrategy > 10) {
      errors.push('Max retries per strategy must be between 1 and 10');
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateConfig();
    setValidationErrors(errors);

    if (errors.length === 0) {
      onSave?.(config);
      setHasChanges(false);
      console.log('✅ Configuration saved successfully');
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
    setValidationErrors([]);
  };

  const tabs = [
    { id: 'performance', label: 'Performance', icon: <Zap className="w-4 h-4" /> },
    { id: 'quality', label: 'Quality', icon: <Download className="w-4 h-4" /> },
    { id: 'antiBlocking', label: 'Anti-Blocking', icon: <Shield className="w-4 h-4" /> },
    { id: 'storage', label: 'Storage', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'logging', label: 'Logging', icon: <Info className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'experimental', label: 'Experimental', icon: <Settings className="w-4 h-4" /> }
  ];

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Concurrent Downloads
        </label>
        <input
          type="number"
          min="1"
          max="10"
          value={config.performance.maxConcurrentDownloads}
          onChange={(e) => updateConfig('performance', 'maxConcurrentDownloads', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Number of videos that can be downloaded simultaneously</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Memory Limit (MB)
        </label>
        <input
          type="number"
          min="256"
          value={config.performance.memoryLimitMB}
          onChange={(e) => updateConfig('performance', 'memoryLimitMB', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Maximum memory usage for the download system</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Network Timeout (seconds)
        </label>
        <input
          type="number"
          min="30"
          value={config.performance.networkTimeoutMs / 1000}
          onChange={(e) => updateConfig('performance', 'networkTimeoutMs', parseInt(e.target.value) * 1000)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Timeout for network operations</p>
      </div>
    </div>
  );

  const renderQualityTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Quality
        </label>
        <select
          value={config.quality.defaultQuality}
          onChange={(e) => updateConfig('quality', 'defaultQuality', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="highest">Highest</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Resolution
        </label>
        <select
          value={config.quality.maxResolution}
          onChange={(e) => updateConfig('quality', 'maxResolution', parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={720}>720p</option>
          <option value={1080}>1080p</option>
          <option value={1440}>1440p</option>
          <option value={2160}>2160p (4K)</option>
        </select>
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.quality.enableHDR}
            onChange={(e) => updateConfig('quality', 'enableHDR', e.target.checked)}
            className="mr-2"
          />
          Enable HDR
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.quality.enable60fps}
            onChange={(e) => updateConfig('quality', 'enable60fps', e.target.checked)}
            className="mr-2"
          />
          Enable 60fps
        </label>
      </div>
    </div>
  );

  const renderAntiBlockingTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.antiBlocking.enableUserAgentRotation}
            onChange={(e) => updateConfig('antiBlocking', 'enableUserAgentRotation', e.target.checked)}
            className="mr-2"
          />
          User Agent Rotation
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.antiBlocking.enableRandomDelays}
            onChange={(e) => updateConfig('antiBlocking', 'enableRandomDelays', e.target.checked)}
            className="mr-2"
          />
          Random Delays
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.antiBlocking.enableCookieManagement}
            onChange={(e) => updateConfig('antiBlocking', 'enableCookieManagement', e.target.checked)}
            className="mr-2"
          />
          Cookie Management
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.antiBlocking.enableAlternativeExtractors}
            onChange={(e) => updateConfig('antiBlocking', 'enableAlternativeExtractors', e.target.checked)}
            className="mr-2"
          />
          Alternative Extractors
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min Delay (ms)
          </label>
          <input
            type="number"
            min="0"
            value={config.antiBlocking.minDelayMs}
            onChange={(e) => updateConfig('antiBlocking', 'minDelayMs', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Delay (ms)
          </label>
          <input
            type="number"
            min="0"
            value={config.antiBlocking.maxDelayMs}
            onChange={(e) => updateConfig('antiBlocking', 'maxDelayMs', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderStorageTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.storage.enableCompression}
            onChange={(e) => updateConfig('storage', 'enableCompression', e.target.checked)}
            className="mr-2"
          />
          Enable Compression
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.storage.enableDuplicateDetection}
            onChange={(e) => updateConfig('storage', 'enableDuplicateDetection', e.target.checked)}
            className="mr-2"
          />
          Duplicate Detection
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.storage.enableThumbnailDownload}
            onChange={(e) => updateConfig('storage', 'enableThumbnailDownload', e.target.checked)}
            className="mr-2"
          />
          Download Thumbnails
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.storage.enableSubtitleDownload}
            onChange={(e) => updateConfig('storage', 'enableSubtitleDownload', e.target.checked)}
            className="mr-2"
          />
          Download Subtitles
        </label>
      </div>

      {config.storage.enableCompression && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Compression Level (1-9)
          </label>
          <input
            type="range"
            min="1"
            max="9"
            value={config.storage.compressionLevel}
            onChange={(e) => updateConfig('storage', 'compressionLevel', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Fast</span>
            <span>Level {config.storage.compressionLevel}</span>
            <span>Best</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderLoggingTab = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Log Level
        </label>
        <select
          value={config.logging.logLevel}
          onChange={(e) => updateConfig('logging', 'logLevel', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="DEBUG">Debug</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warning</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.logging.enableDebugLogging}
            onChange={(e) => updateConfig('logging', 'enableDebugLogging', e.target.checked)}
            className="mr-2"
          />
          Debug Logging
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.logging.enableFileLogging}
            onChange={(e) => updateConfig('logging', 'enableFileLogging', e.target.checked)}
            className="mr-2"
          />
          File Logging
        </label>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.notifications.enableProgressNotifications}
            onChange={(e) => updateConfig('notifications', 'enableProgressNotifications', e.target.checked)}
            className="mr-2"
          />
          Progress Notifications
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.notifications.enableErrorNotifications}
            onChange={(e) => updateConfig('notifications', 'enableErrorNotifications', e.target.checked)}
            className="mr-2"
          />
          Error Notifications
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notification Duration (seconds)
        </label>
        <input
          type="number"
          min="1"
          max="30"
          value={config.notifications.notificationDurationMs / 1000}
          onChange={(e) => updateConfig('notifications', 'notificationDurationMs', parseInt(e.target.value) * 1000)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );

  const renderExperimentalTab = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <span className="text-sm font-medium text-yellow-800">
            Experimental Features
          </span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          These features are experimental and may not work as expected. Use with caution.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.experimental.enableAdaptiveQuality}
            onChange={(e) => updateConfig('experimental', 'enableAdaptiveQuality', e.target.checked)}
            className="mr-2"
          />
          Adaptive Quality
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.experimental.enableBandwidthOptimization}
            onChange={(e) => updateConfig('experimental', 'enableBandwidthOptimization', e.target.checked)}
            className="mr-2"
          />
          Bandwidth Optimization
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.experimental.enablePredictiveRetries}
            onChange={(e) => updateConfig('experimental', 'enablePredictiveRetries', e.target.checked)}
            className="mr-2"
          />
          Predictive Retries
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.experimental.enableCDNFallback}
            onChange={(e) => updateConfig('experimental', 'enableCDNFallback', e.target.checked)}
            className="mr-2"
          />
          CDN Fallback
        </label>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'performance': return renderPerformanceTab();
      case 'quality': return renderQualityTab();
      case 'antiBlocking': return renderAntiBlockingTab();
      case 'storage': return renderStorageTab();
      case 'logging': return renderLoggingTab();
      case 'notifications': return renderNotificationsTab();
      case 'experimental': return renderExperimentalTab();
      default: return renderPerformanceTab();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Advanced YouTube Downloader Settings
            </h2>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center mb-2">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="font-medium text-red-800">Configuration Errors</span>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200">
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <div className="flex items-center text-sm text-amber-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Unsaved changes
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </button>
            
            <button
              onClick={handleSave}
              disabled={validationErrors.length > 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default YouTubeAdvancedSettings;