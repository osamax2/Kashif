import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from './api';

// Push notifications are only available in standalone builds, not Expo Go
const isExpoGo = Constants.appOwnership === 'expo';
const notificationsAvailable = !isExpoGo;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: string;
  related_report_id?: number;
  related_coupon_id?: number;
  is_read: boolean;
  created_at: string;
}

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Request permission and register device for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!notificationsAvailable) {
      console.log('⚠️ Push notifications not available in Expo Go - use a development build for testing');
      return null;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      // Get push token with project ID from app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });
      
      this.expoPushToken = tokenData.data;
      console.log('Push token obtained:', this.expoPushToken);

      // Register with backend
      await this.registerDeviceToken(this.expoPushToken);
      
      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Register device token with backend
   * Note: Currently disabled as notification service endpoints are not yet implemented
   */
  private async registerDeviceToken(token: string): Promise<void> {
    try {
      // TODO: Implement when notification service backend is ready
      // await api.post('/api/notifications/register-device', {
      //   token,
      //   device_type: Platform.OS,
      // });
      console.log('Device token registration skipped - backend not available');
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  /**
   * Unregister device token
   */
  async unregisterDevice(): Promise<void> {
    if (!this.expoPushToken) return;

    try {
      // TODO: Implement when notification service backend is ready
      // await api.delete(`/api/notifications/unregister-device/${this.expoPushToken}`);
      this.expoPushToken = null;
      console.log('Device token unregistered');
    } catch (error) {
      console.error('Failed to unregister device token:', error);
    }
  }

  /**
   * Get all notifications
   */
  async getNotifications(skip: number = 0, limit: number = 100, unreadOnly: boolean = false): Promise<PushNotification[]> {
    try {
      const response = await api.get<PushNotification[]>('/api/notifications/', {
        params: { skip, limit, unread_only: unreadOnly },
      });
      return response.data;
    } catch (error: any) {
      // Silently return empty array if endpoint not available (404)
      if (error?.response?.status === 404) {
        return [];
      }
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<void> {
    try {
      await api.patch(`/api/notifications/${notificationId}/read`);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await api.post('/api/notifications/mark-all-read');
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('Failed to mark all notifications as read:', error);
      }
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get<{ unread_count: number }>('/api/notifications/unread-count');
      return response.data.unread_count;
    } catch (error: any) {
      // Silently return 0 if endpoint not available
      if (error?.response?.status === 404) {
        return 0;
      }
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Setup notification listeners
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: any) => void,
    onNotificationTapped?: (response: any) => void
  ) {
    if (!notificationsAvailable) {
      console.log('Notification listeners not available');
      return () => {};
    }

    // Listen for notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      onNotificationReceived?.(notification);
    });

    // Listen for notifications tapped by user
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      onNotificationTapped?.(response);
    });

    // Return cleanup function
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default new NotificationService();
