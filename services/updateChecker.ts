// services/updateChecker.ts
// Checks GitHub releases for app updates

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Alert, Linking, Platform } from 'react-native';

// GitHub repository info
const GITHUB_OWNER = 'osamax2'; // Replace with your GitHub username
const GITHUB_REPO = 'Kashif'; // Replace with your repository name
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// Storage keys
const LAST_CHECK_KEY = 'app_update_last_check';
const SKIPPED_VERSION_KEY = 'app_update_skipped_version';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check once per day (in milliseconds)

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  releaseUrl: string;
  apkUrl?: string;
}

/**
 * Get the current app version from app.json/Constants
 */
export const getCurrentVersion = (): string => {
  return Constants.expoConfig?.version || '1.0.0';
};

/**
 * Compare two semantic version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.replace(/^v/, '').split('.').map(Number);
  const parts2 = v2.replace(/^v/, '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  
  return 0;
};

/**
 * Fetch the latest release from GitHub
 */
const fetchLatestRelease = async (): Promise<GitHubRelease | null> => {
  try {
    console.log('🌐 Fetching latest release from:', GITHUB_API_URL);
    
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Kashif-App',
      },
    });
    
    if (!response.ok) {
      console.log('❌ GitHub API error - Status:', response.status);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Got release:', data.tag_name, '-', data.name);
    return data;
  } catch (error) {
    console.error('❌ Error fetching GitHub release:', error);
    return null;
  }
};

/**
 * Check if an update is available
 */
export const checkForUpdate = async (forceCheck: boolean = false): Promise<UpdateInfo | null> => {
  try {
    const currentVersion = getCurrentVersion();
    console.log('📱 Update Check - Current app version:', currentVersion);
    
    // Check if we should skip this check (rate limiting)
    // Reduced to 1 hour for better responsiveness
    const effectiveCheckInterval = 60 * 60 * 1000; // 1 hour instead of 24 hours
    
    if (!forceCheck) {
      const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
      if (lastCheck) {
        const timeSinceLastCheck = Date.now() - parseInt(lastCheck, 10);
        if (timeSinceLastCheck < effectiveCheckInterval) {
          console.log('⏳ Skipping update check - checked recently (', Math.round(timeSinceLastCheck / 60000), 'min ago)');
          return null;
        }
      }
    }
    
    // Fetch latest release
    const release = await fetchLatestRelease();
    if (!release) {
      return null;
    }
    
    // Save check timestamp
    await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
    
    const latestVersion = release.tag_name.replace(/^v/, '');
    
    console.log('🔄 Update Check - Latest version:', latestVersion);
    console.log('🔄 Version comparison:', currentVersion, 'vs', latestVersion);
    
    // Check if update is available
    const comparison = compareVersions(latestVersion, currentVersion);
    console.log('🔄 Comparison result:', comparison, '(1 = update available, 0 = same, -1 = older)');
    
    if (comparison <= 0) {
      console.log('✅ App is up to date');
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion,
        releaseNotes: '',
        downloadUrl: '',
        releaseUrl: release.html_url,
      };
    }
    
    console.log('🆕 Update available:', latestVersion);
    
    // Check if user skipped this version
    const skippedVersion = await AsyncStorage.getItem(SKIPPED_VERSION_KEY);
    if (skippedVersion === latestVersion && !forceCheck) {
      console.log('⏭️ User skipped this version:', skippedVersion);
      return null;
    }
    
    // Find APK download URL
    const apkAsset = release.assets.find(
      (asset) => asset.name.endsWith('.apk') && Platform.OS === 'android'
    );
    
    return {
      hasUpdate: true,
      currentVersion,
      latestVersion,
      releaseNotes: release.body || 'Bug fixes and improvements',
      downloadUrl: apkAsset?.browser_download_url || release.html_url,
      releaseUrl: release.html_url,
      apkUrl: apkAsset?.browser_download_url,
    };
  } catch (error) {
    console.error('Error checking for update:', error);
    return null;
  }
};

/**
 * Show update dialog to user
 */
export const showUpdateDialog = (
  updateInfo: UpdateInfo,
  language: 'ar' | 'en' | 'de' = 'ar',
  onSkip?: () => void
): void => {
  const messages = {
    ar: {
      title: '🆕 تحديث جديد متاح',
      message: `الإصدار ${updateInfo.latestVersion} متاح الآن!\n\nالإصدار الحالي: ${updateInfo.currentVersion}\n\n${updateInfo.releaseNotes}`,
      update: 'تحديث الآن',
      later: 'لاحقاً',
      skip: 'تخطي هذا الإصدار',
    },
    en: {
      title: '🆕 New Update Available',
      message: `Version ${updateInfo.latestVersion} is now available!\n\nCurrent version: ${updateInfo.currentVersion}\n\n${updateInfo.releaseNotes}`,
      update: 'Update Now',
      later: 'Later',
      skip: 'Skip this version',
    },
    de: {
      title: '🆕 Neues Update verfügbar',
      message: `Version ${updateInfo.latestVersion} ist jetzt verfügbar!\n\nAktuelle Version: ${updateInfo.currentVersion}\n\n${updateInfo.releaseNotes}`,
      update: 'Jetzt aktualisieren',
      later: 'Später',
      skip: 'Diese Version überspringen',
    },
  };
  
  const t = messages[language] || messages.ar;
  
  Alert.alert(
    t.title,
    t.message,
    [
      {
        text: t.skip,
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.setItem(SKIPPED_VERSION_KEY, updateInfo.latestVersion);
          onSkip?.();
        },
      },
      {
        text: t.later,
        style: 'cancel',
      },
      {
        text: t.update,
        onPress: () => {
          // Open download URL
          if (updateInfo.apkUrl && Platform.OS === 'android') {
            Linking.openURL(updateInfo.apkUrl);
          } else {
            Linking.openURL(updateInfo.releaseUrl);
          }
        },
      },
    ],
    { cancelable: true }
  );
};

/**
 * Clear update cache - useful for forcing update check
 */
export const clearUpdateCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LAST_CHECK_KEY);
    await AsyncStorage.removeItem(SKIPPED_VERSION_KEY);
    console.log('🧹 Update cache cleared');
  } catch (error) {
    console.error('Error clearing update cache:', error);
  }
};

/**
 * Check for updates and show dialog if available
 * Call this on app startup
 */
export const checkAndPromptForUpdate = async (
  language: 'ar' | 'en' | 'de' = 'ar',
  forceCheck: boolean = false
): Promise<boolean> => {
  try {
    console.log('🔍 Starting update check... (forceCheck:', forceCheck, ')');
    const updateInfo = await checkForUpdate(forceCheck);
    
    if (updateInfo?.hasUpdate) {
      console.log('📢 Showing update dialog for version:', updateInfo.latestVersion);
      showUpdateDialog(updateInfo, language);
      return true;
    } else if (updateInfo) {
      console.log('ℹ️ No update available - current:', updateInfo.currentVersion, 'latest:', updateInfo.latestVersion);
    } else {
      console.log('ℹ️ Update check returned null (skipped or error)');
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error in checkAndPromptForUpdate:', error);
    return false;
  }
};

export default {
  getCurrentVersion,
  checkForUpdate,
  showUpdateDialog,
  checkAndPromptForUpdate,
  clearUpdateCache,
};
