import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure wrapper for storing sensitive data (tokens, credentials).
 * Uses expo-secure-store (Keychain on iOS, EncryptedSharedPreferences on Android)
 * instead of plain AsyncStorage.
 */

const MIGRATION_KEY = '@kashif_secure_migrated';

// SecureStore keys must only contain alphanumeric, '.', '-', '_' characters
function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function secureGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(sanitizeKey(key));
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(sanitizeKey(key), value);
}

export async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(sanitizeKey(key));
  } catch {
    // Ignore if key doesn't exist
  }
}

export async function secureMultiDelete(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => secureDelete(k)));
}

/**
 * One-time migration: move tokens from plain AsyncStorage to SecureStore.
 * After migration, old AsyncStorage keys are deleted.
 */
export async function migrateTokensToSecureStore(keys: string[]): Promise<void> {
  const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
  if (migrated === 'true') return;

  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      await SecureStore.setItemAsync(sanitizeKey(key), value);
      await AsyncStorage.removeItem(key);
    }
  }

  await AsyncStorage.setItem(MIGRATION_KEY, 'true');
}
