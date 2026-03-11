import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Detects if the device is rooted (Android) or jailbroken (iOS).
 * Uses heuristic file checks — no native module required.
 */

const ROOTED_PATHS_ANDROID = [
  '/system/app/Superuser.apk',
  '/system/xbin/su',
  '/system/bin/su',
  '/sbin/su',
  '/data/local/xbin/su',
  '/data/local/bin/su',
  '/data/local/su',
  '/system/bin/failsafe/su',
  '/system/sd/xbin/su',
  '/su/bin/su',
  '/system/app/SuperSU.apk',
  '/system/app/SuperSU',
  '/system/app/Magisk.apk',
];

const JAILBREAK_PATHS_IOS = [
  '/Applications/Cydia.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/bin/bash',
  '/usr/sbin/sshd',
  '/etc/apt',
  '/private/var/lib/apt/',
  '/usr/bin/ssh',
  '/private/var/stash',
  '/private/var/lib/cydia',
  '/var/lib/cydia',
];

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    return info.exists;
  } catch {
    return false;
  }
}

export async function isDeviceCompromised(): Promise<boolean> {
  const paths = Platform.OS === 'android' ? ROOTED_PATHS_ANDROID : JAILBREAK_PATHS_IOS;

  for (const p of paths) {
    if (await fileExists(p)) {
      return true;
    }
  }
  return false;
}

/**
 * Show a warning alert if the device is rooted/jailbroken.
 * Call this once on app startup.
 */
export async function checkDeviceIntegrity(language: string): Promise<void> {
  const compromised = await isDeviceCompromised();
  if (!compromised) return;

  const title =
    language === 'ar' ? 'تحذير أمان' :
    language === 'ku' ? 'Hişyariya ewlehiyê' :
    'Security Warning';

  const message =
    language === 'ar'
      ? 'جهازك يبدو مُعدّلاً (rooted/jailbroken). قد تكون بياناتك في خطر.'
      : language === 'ku'
        ? 'Amûra te guhertî xuya dike (root/jailbreak). Daneyên te dibe ku di xeterê de bin.'
        : 'Your device appears to be modified (rooted/jailbroken). Your data may be at risk.';

  Alert.alert(title, message);
}
