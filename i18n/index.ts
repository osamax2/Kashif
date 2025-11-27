// i18n/index.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import ar from './locales/ar.json';
import en from './locales/en.json';

export type Language = 'ar' | 'en';

export interface Translations {
  [key: string]: string | Translations;
}

const translations: Record<Language, Translations> = {
  ar,
  en,
};

let currentLanguage: Language = 'ar'; // Default to Arabic

export const initI18n = async (): Promise<Language> => {
  try {
    const savedLang = await AsyncStorage.getItem('app_language');
    if (savedLang === 'ar' || savedLang === 'en') {
      currentLanguage = savedLang;
    }
    
    // Configure RTL/LTR
    const shouldBeRTL = currentLanguage === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
    
    return currentLanguage;
  } catch (error) {
    console.error('Error initializing i18n:', error);
    return 'ar';
  }
};

export const setLanguage = async (lang: Language): Promise<void> => {
  try {
    currentLanguage = lang;
    await AsyncStorage.setItem('app_language', lang);
    
    // Configure RTL/LTR
    const shouldBeRTL = lang === 'ar';
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  } catch (error) {
    console.error('Error setting language:', error);
  }
};

export const getCurrentLanguage = (): Language => {
  return currentLanguage;
};

export const isRTL = (): boolean => {
  return currentLanguage === 'ar';
};

// Get nested translation value
const getNestedTranslation = (obj: Translations, path: string): string => {
  const keys = path.split('.');
  let value: any = obj;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return path; // Return key if not found
    }
  }
  
  return typeof value === 'string' ? value : path;
};

// Main translation function
export const t = (key: string, params?: Record<string, string | number>): string => {
  let translation = getNestedTranslation(translations[currentLanguage], key);
  
  // Replace parameters
  if (params) {
    Object.keys(params).forEach((param) => {
      translation = translation.replace(`{{${param}}}`, String(params[param]));
    });
  }
  
  return translation;
};

// Get locale for date formatting
export const getLocale = (): string => {
  return currentLanguage === 'ar' ? 'ar-SA' : 'en-US';
};

export default {
  t,
  setLanguage,
  getCurrentLanguage,
  initI18n,
  isRTL,
  getLocale,
};
