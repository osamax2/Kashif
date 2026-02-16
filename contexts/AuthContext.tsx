import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { logout as apiLogout, authAPI, getStoredUser, isLoggedIn, User } from '../services/api';
import notificationService from '../services/notifications';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  setUser: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (user) {
      registerPushNotifications();
    }
  }, [user]);

  // Protect routes
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isLoginPage = segments[0] === 'index' || segments[0] === undefined;
    const isRegisterPage = segments[0] === 'register';
    const isForgotPage = segments[0] === 'forgot';

    if (!user && inAuthGroup) {
      // User not authenticated but trying to access protected route
      router.replace('/');
    } else if (user && (isLoginPage || isRegisterPage)) {
      // User is authenticated but on login/register page
      router.replace('/(tabs)/home');
    }
  }, [user, segments, loading]);

  const checkAuth = async () => {
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth check timeout')), 3000)
      );
      
      const authPromise = async () => {
        const loggedIn = await isLoggedIn();
        if (loggedIn) {
          const storedUser = await getStoredUser();
          setUser(storedUser);
        }
      };
      
      await Promise.race([authPromise(), timeoutPromise]);
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const registerPushNotifications = async () => {
    try {
      // Push notifications are disabled in Expo Go - will work in development build
      await notificationService.registerForPushNotifications();
    } catch (error) {
      // Silently fail - notifications not available in Expo Go
    }
  };

  const logout = async () => {
    try {
      // Unregister device before logout
      await notificationService.unregisterDevice();
      await apiLogout();
      setUser(null);
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      // Fetch fresh user data from server to get updated points
      const freshUser = await authAPI.getProfile();
      setUser(freshUser);
      console.log('✅ User data refreshed from server:', freshUser.total_points, 'points');
    } catch (error) {
      console.error('Refresh user error:', error);
      // Fallback to stored user if server request fails
      try {
        const storedUser = await getStoredUser();
        setUser(storedUser);
      } catch (e) {
        console.error('Failed to get stored user:', e);
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        setUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
