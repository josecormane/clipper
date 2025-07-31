'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Download, X } from 'lucide-react';

export interface DownloadNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  url?: string;
  videoTitle?: string;
  projectId?: string;
  timestamp: number;
  autoHide?: boolean;
  duration?: number;
}

interface YouTubeDownloadNotificationsProps {
  notifications: DownloadNotification[];
  onDismiss: (id: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}

const NOTIFICATION_ICONS = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
  info: <Download className="w-5 h-5 text-blue-500" />
};

const NOTIFICATION_STYLES = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info: 'bg-blue-50 border-blue-200'
};

function NotificationItem({
  notification,
  onDismiss,
  onNavigateToProject
}: {
  notification: DownloadNotification;
  onDismiss: (id: string) => void;
  onNavigateToProject?: (projectId: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animación de entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-hide para notificaciones de éxito
    if (notification.autoHide !== false && notification.type === 'success') {
      const duration = notification.duration || 5000;
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.autoHide, notification.type, notification.duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const handleProjectNavigation = () => {
    if (notification.projectId && onNavigateToProject) {
      onNavigateToProject(notification.projectId);
      handleDismiss();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Menos de 1 minuto
      return 'Ahora';
    } else if (diff < 3600000) { // Menos de 1 hora
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes}m`;
    } else {
      const hours = Math.floor(diff / 3600000);
      return `Hace ${hours}h`;
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${isLeaving ? 'scale-95' : 'scale-100'}
      `}
    >
      <div className={`
        rounded-lg border p-4 shadow-sm
        ${NOTIFICATION_STYLES[notification.type]}
      `}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {NOTIFICATION_ICONS[notification.type]}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">
                {notification.title}
              </h4>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {formatTimestamp(notification.timestamp)}
                </span>
                
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="mt-1 text-sm text-gray-600">
              {notification.message}
            </p>

            {notification.videoTitle && (
              <p className="mt-1 text-xs text-gray-500 font-medium">
                "{notification.videoTitle}"
              </p>
            )}

            {notification.url && (
              <p className="mt-1 text-xs text-gray-400 break-all">
                {notification.url}
              </p>
            )}

            {notification.projectId && notification.type === 'success' && (
              <div className="mt-3">
                <button
                  onClick={handleProjectNavigation}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  Ver Proyecto
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function YouTubeDownloadNotifications({
  notifications,
  onDismiss,
  onNavigateToProject
}: YouTubeDownloadNotificationsProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          onNavigateToProject={onNavigateToProject}
        />
      ))}
    </div>
  );
}

// Hook para manejar notificaciones
export function useDownloadNotifications() {
  const [notifications, setNotifications] = useState<DownloadNotification[]>([]);

  const addNotification = (notification: Omit<DownloadNotification, 'id' | 'timestamp'>) => {
    const newNotification: DownloadNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Máximo 5 notificaciones
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Funciones de conveniencia
  const notifySuccess = (title: string, message: string, options?: Partial<DownloadNotification>) => {
    addNotification({
      type: 'success',
      title,
      message,
      autoHide: true,
      duration: 5000,
      ...options
    });
  };

  const notifyError = (title: string, message: string, options?: Partial<DownloadNotification>) => {
    addNotification({
      type: 'error',
      title,
      message,
      autoHide: false,
      ...options
    });
  };

  const notifyWarning = (title: string, message: string, options?: Partial<DownloadNotification>) => {
    addNotification({
      type: 'warning',
      title,
      message,
      autoHide: false,
      ...options
    });
  };

  const notifyInfo = (title: string, message: string, options?: Partial<DownloadNotification>) => {
    addNotification({
      type: 'info',
      title,
      message,
      autoHide: true,
      duration: 3000,
      ...options
    });
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
  };
}

export default YouTubeDownloadNotifications;