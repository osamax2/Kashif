import { useRouter, useSegments } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { logout as apiLogout, getStoredUser, isLoggedIn, User } from '../services/api';

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
      const loggedIn = await isLoggedIn();
      if (loggedIn) {
        const storedUser = await getStoredUser();
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
      setUser(null);
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const storedUser = await getStoredUser();
      setUser(storedUser);
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

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
