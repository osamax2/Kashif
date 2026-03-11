import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Remote API configuration with fallback support.
 * 
 * If the primary domain goes down, the app will:
 * 1. Try to fetch a remote config from GitHub (can be updated without app release)
 * 2. Fall back to alternate URLs (direct IP)
 * 3. Use the last known working URL from cache
 */

const CONFIG_CACHE_KEY = '@kashif_api_config';
const LAST_WORKING_URL_KEY = '@kashif_last_working_url';

// Remote config hosted on GitHub Pages / raw GitHub (update without app release)
const REMOTE_CONFIG_URL = 'https://raw.githubusercontent.com/osamax2/Kashif/main/api-config.json';

// Built-in fallback URLs (tried in order)
const DEFAULT_URLS = [
  'https://api.kashifroad.com',
  'http://87.106.51.243:2299',
];

const CONFIG_FETCH_TIMEOUT = 5000; // 5s timeout for config fetch
const HEALTH_CHECK_TIMEOUT = 4000; // 4s timeout for health checks

interface ApiConfig {
  baseUrl: string;
  fallbackUrls: string[];
  updatedAt?: string;
}

let _resolvedBaseUrl: string | null = null;

/**
 * Fetch remote config from GitHub (can be updated without app release)
 */
async function fetchRemoteConfig(): Promise<ApiConfig | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG_FETCH_TIMEOUT);

    const response = await fetch(REMOTE_CONFIG_URL, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const config = await response.json();
    // Cache the config locally
    await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
    return config;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is reachable
 */
async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Resolve the best available API base URL.
 * Called once at app startup and cached for the session.
 */
export async function resolveApiBaseUrl(): Promise<string> {
  // Return cached result if already resolved this session
  if (_resolvedBaseUrl) return _resolvedBaseUrl;

  // 1. Try last known working URL first (fastest path)
  const lastWorking = await AsyncStorage.getItem(LAST_WORKING_URL_KEY);
  if (lastWorking && await isUrlReachable(lastWorking)) {
    _resolvedBaseUrl = lastWorking;
    return lastWorking;
  }

  // 2. Try remote config from GitHub
  const remoteConfig = await fetchRemoteConfig();
  const urlsToTry = remoteConfig
    ? [remoteConfig.baseUrl, ...remoteConfig.fallbackUrls]
    : DEFAULT_URLS;

  // Also try cached config if remote fetch failed
  if (!remoteConfig) {
    try {
      const cachedStr = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
      if (cachedStr) {
        const cached: ApiConfig = JSON.parse(cachedStr);
        urlsToTry.unshift(cached.baseUrl);
        urlsToTry.push(...cached.fallbackUrls);
      }
    } catch {
      // ignore cache read errors
    }
  }

  // Deduplicate URLs
  const uniqueUrls = [...new Set(urlsToTry)];

  // 3. Try each URL
  for (const url of uniqueUrls) {
    if (await isUrlReachable(url)) {
      _resolvedBaseUrl = url;
      await AsyncStorage.setItem(LAST_WORKING_URL_KEY, url);
      return url;
    }
  }

  // 4. If nothing works, return primary URL (will show errors gracefully)
  _resolvedBaseUrl = DEFAULT_URLS[0];
  return DEFAULT_URLS[0];
}

/**
 * Get the currently resolved base URL (non-async, returns default if not yet resolved)
 */
export function getBaseUrl(): string {
  return _resolvedBaseUrl || DEFAULT_URLS[0];
}

/**
 * Reset resolved URL (call when a request fails to force re-resolution)
 */
export function resetBaseUrl(): void {
  _resolvedBaseUrl = null;
}
