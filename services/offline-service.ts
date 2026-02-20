// services/offline-service.ts
// Comprehensive offline mode management - map data caching, sync queue, hazard cache
import { reportingAPI } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Storage keys
const CACHE_KEYS = {
  NEARBY_REPORTS: 'offline_nearby_reports',
  LAST_SYNC: 'offline_last_sync',
  SYNC_QUEUE: 'offline_sync_queue',
  CACHED_REGION: 'offline_cached_region',
  USER_REPORTS: 'offline_user_reports',
};

// Types
export interface CachedReport {
  id: number;
  title: string;
  description?: string;
  category_id: number;
  status_id: number;
  severity: string;
  latitude: number;
  longitude: number;
  address?: string;
  photo_urls?: string;
  created_at: string;
  confirmation_count?: number;
  confirmation_status?: string;
}

export interface SyncQueueItem {
  id: string;
  type: 'CREATE_REPORT';
  data: any;
  photoUri?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  lastAttempt?: number;
}

export interface CachedRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  cachedAt: number;
}

// ============================================================
// Hazard Data Cache
// ============================================================

/**
 * Cache nearby reports/hazards for offline access
 */
export async function cacheNearbyReports(reports: CachedReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.NEARBY_REPORTS, JSON.stringify(reports));
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, String(Date.now()));
    console.log(`📦 Cached ${reports.length} nearby reports for offline use`);
  } catch (error) {
    console.error('Failed to cache nearby reports:', error);
  }
}

/**
 * Get cached nearby reports for offline display
 */
export async function getCachedNearbyReports(): Promise<CachedReport[]> {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.NEARBY_REPORTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get cached reports:', error);
    return [];
  }
}

/**
 * Cache user's own reports for offline viewing
 */
export async function cacheUserReports(reports: CachedReport[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.USER_REPORTS, JSON.stringify(reports));
  } catch (error) {
    console.error('Failed to cache user reports:', error);
  }
}

/**
 * Get cached user reports
 */
export async function getCachedUserReports(): Promise<CachedReport[]> {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.USER_REPORTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get cached user reports:', error);
    return [];
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime(): Promise<number | null> {
  try {
    const ts = await AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC);
    return ts ? Number(ts) : null;
  } catch {
    return null;
  }
}

/**
 * Save the current map region for offline cache reference
 */
export async function cacheMapRegion(region: CachedRegion): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.CACHED_REGION, JSON.stringify(region));
  } catch (error) {
    console.error('Failed to cache map region:', error);
  }
}

/**
 * Get cached map region
 */
export async function getCachedMapRegion(): Promise<CachedRegion | null> {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.CACHED_REGION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ============================================================
// Sync Queue with Retry Logic
// ============================================================

/**
 * Add an item to the sync queue
 */
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'retryCount' | 'maxRetries' | 'createdAt'>): Promise<void> {
  try {
    const queue = await getSyncQueue();
    queue.push({
      ...item,
      retryCount: 0,
      maxRetries: 5,
      createdAt: Date.now(),
    });
    await AsyncStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    console.log(`📝 Added to sync queue: ${item.type} (${item.id})`);
  } catch (error) {
    console.error('Failed to add to sync queue:', error);
  }
}

/**
 * Get current sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEYS.SYNC_QUEUE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Remove item from sync queue
 */
export async function removeFromSyncQueue(itemId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const updated = queue.filter(q => q.id !== itemId);
    await AsyncStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to remove from sync queue:', error);
  }
}

/**
 * Update retry count for a queue item
 */
export async function updateQueueItemRetry(itemId: string): Promise<void> {
  try {
    const queue = await getSyncQueue();
    const item = queue.find(q => q.id === itemId);
    if (item) {
      item.retryCount += 1;
      item.lastAttempt = Date.now();
      await AsyncStorage.setItem(CACHE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    }
  } catch (error) {
    console.error('Failed to update queue item:', error);
  }
}

/**
 * Get sync queue count
 */
export async function getSyncQueueCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}

/**
 * Process sync queue with exponential backoff
 * Returns: number of successfully synced items
 */
export async function processSyncQueue(): Promise<number> {
  const state = await NetInfo.fetch();
  if (!state.isConnected || state.isInternetReachable === false) {
    return 0;
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) return 0;

  console.log(`🔄 Processing sync queue: ${queue.length} items`);
  let synced = 0;

  for (const item of queue) {
    // Skip items that have exceeded max retries
    if (item.retryCount >= item.maxRetries) {
      console.warn(`❌ Removing item ${item.id} after ${item.maxRetries} failed attempts`);
      await removeFromSyncQueue(item.id);
      continue;
    }

    // Exponential backoff: wait longer between retries
    if (item.lastAttempt && item.retryCount > 0) {
      const backoffMs = Math.min(1000 * Math.pow(2, item.retryCount), 60000);
      const elapsed = Date.now() - item.lastAttempt;
      if (elapsed < backoffMs) {
        continue; // Skip this item, not enough time has passed
      }
    }

    try {
      if (item.type === 'CREATE_REPORT') {
        // Map type to category_id
        const categoryMap: Record<string, number> = {
          pothole: 1, environment: 2, accident: 3,
        };
        const severityMap: Record<string, string> = {
          low: 'low', medium: 'medium', high: 'high',
        };

        await reportingAPI.createReport({
          title: item.data.type === 'pothole' ? 'Pothole' :
                 item.data.type === 'environment' ? 'Environment' : 'Accident',
          description: item.data.notes || `${item.data.type} report`,
          category_id: categoryMap[item.data.type || 'pothole'] || 1,
          severity: (severityMap[item.data.severity] as any) || 'medium',
          latitude: item.data.latitude || 0,
          longitude: item.data.longitude || 0,
          address: item.data.address,
        });

        await removeFromSyncQueue(item.id);
        synced++;
        console.log(`✅ Synced report: ${item.id}`);
      }
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      await updateQueueItemRetry(item.id);
    }
  }

  return synced;
}

// ============================================================
// Offline Proximity Warnings
// ============================================================

/**
 * Check cached hazards near a given location
 * Returns hazards within radiusKm
 */
export async function getNearbyHazardsOffline(
  latitude: number,
  longitude: number,
  radiusKm: number = 1
): Promise<CachedReport[]> {
  const cached = await getCachedNearbyReports();
  
  return cached.filter(report => {
    if (!report.latitude || !report.longitude) return false;
    const dist = haversineDistance(latitude, longitude, report.latitude, report.longitude);
    return dist <= radiusKm;
  });
}

/**
 * Haversine distance between two GPS coordinates in km
 */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ============================================================
// Network Monitoring
// ============================================================

/**
 * Subscribe to connectivity changes with sync triggers
 */
export function onConnectivityChange(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  let wasOffline = false;

  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    
    if (online && wasOffline) {
      console.log('🌐 Back online — triggering sync');
      onOnline();
    } else if (!online && !wasOffline) {
      console.log('📴 Went offline');
      onOffline();
    }
    
    wasOffline = !online;
  });

  return unsubscribe;
}

/**
 * Check current connectivity
 */
export async function checkConnectivity(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}
