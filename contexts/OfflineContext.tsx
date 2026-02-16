// contexts/OfflineContext.tsx
// Global offline state management with sync queue and network banner
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  checkConnectivity,
  getSyncQueueCount,
  onConnectivityChange,
  processSyncQueue,
} from '@/services/offline-service';
import {
  getPendingReportsCount,
} from '@/services/offline-reports';

const YELLOW = '#F4B400';

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  syncNow: () => Promise<number>;
  refreshPendingCount: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const [queueCount, pendingReports] = await Promise.all([
      getSyncQueueCount(),
      getPendingReportsCount(),
    ]);
    setPendingCount(queueCount + pendingReports);
  }, []);

  const syncNow = useCallback(async (): Promise<number> => {
    const synced = await processSyncQueue();
    await refreshPendingCount();
    return synced;
  }, [refreshPendingCount]);

  // Monitor connectivity
  useEffect(() => {
    // Check initial state
    checkConnectivity().then(online => {
      setIsOnline(online);
      if (!online) {
        Animated.timing(bannerAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });

    refreshPendingCount();

    const unsubscribe = onConnectivityChange(
      // Online
      async () => {
        setIsOnline(true);
        Animated.timing(bannerAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
        // Auto-sync when reconnected
        const synced = await syncNow();
        if (synced > 0) {
          console.log(`🔄 Auto-synced ${synced} items on reconnect`);
        }
      },
      // Offline
      () => {
        setIsOnline(false);
        Animated.timing(bannerAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    );

    // Periodic sync attempt every 2 minutes when online
    syncIntervalRef.current = setInterval(async () => {
      const online = await checkConnectivity();
      if (online) {
        await syncNow();
      }
    }, 120000);

    return () => {
      unsubscribe();
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, syncNow, refreshPendingCount }}>
      {children}
      {/* Offline Banner */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.banner,
          {
            opacity: bannerAnim,
            transform: [{
              translateY: bannerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            }],
          },
        ]}
      >
        <View style={styles.bannerContent}>
          <Text style={styles.bannerIcon}>📴</Text>
          <Text style={styles.bannerText}>{t('offline.banner')}</Text>
          {pendingCount > 0 && (
            <Text style={styles.bannerPending}>
              {t('offline.pending', { count: pendingCount })}
            </Text>
          )}
        </View>
      </Animated.View>
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  bannerContent: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  bannerIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  bannerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
  },
  bannerPending: {
    color: '#ffd',
    fontSize: 12,
    marginLeft: 8,
  },
});
