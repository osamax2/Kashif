import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import notificationService, { PushNotification } from '../services/notifications';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: PushNotification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  registerForPushNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  registerForPushNotifications: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Setup notification listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanup = notificationService.setupNotificationListeners(
      // Handle notification received in foreground
      (notification) => {
        console.log('New notification received:', notification);
        refreshNotifications();
      },
      // Handle notification tapped
      (response) => {
        const data = response.notification.request.content.data;
        
        // Navigate based on notification type - deep-link to specific report
        if (data.report_id) {
          router.push(`/(tabs)/reports?reportId=${data.report_id}` as any);
        } else if (data.related_report_id) {
          router.push(`/(tabs)/reports?reportId=${data.related_report_id}` as any);
        } else if (data.notification_id) {
          router.push('/notifications');
        }
      }
    );

    return cleanup;
  }, [isAuthenticated]);

  // Load notifications when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshNotifications();
      updateUnreadCount();
      // Register for push notifications
      registerForPushNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, user]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const data = await notificationService.getNotifications(0, 100);
      setNotifications(data);
      await updateUnreadCount();
    } catch (error) {
      // Silently handle - notifications endpoint may not be available yet
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const updateUnreadCount = async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Silently handle - notifications endpoint may not be available yet
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      
      await updateUnreadCount();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      await notificationService.registerForPushNotifications();
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications,
        markAsRead,
        markAllAsRead,
        registerForPushNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
