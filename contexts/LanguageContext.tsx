// contexts/LanguageContext.tsx
import { getLocale, initI18n, isRTL, Language, setLanguage as setI18nLanguage, t } from '@/i18n';
import { userAPI } from '@/services/api';
import * as Updates from 'expo-updates';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  locale: string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ar');
  const [isLoading, setIsLoading] = useState(true);
  const [rtl, setRtl] = useState(true);
  const [locale, setLocale] = useState('ar-SA');

  // Initialize language on app start
  useEffect(() => {
    const initialize = async () => {
      try {
        const lang = await initI18n();
        setLanguageState(lang);
        setRtl(isRTL());
        setLocale(getLocale());
      } catch (error) {
        console.error('Error initializing language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Change language with backend sync and app restart prompt
  const changeLanguage = async (newLang: Language) => {
    if (newLang === language) return;

    try {
      // Save to AsyncStorage and configure RTL/LTR
      await setI18nLanguage(newLang);
      
      // Update backend (optional - if user is logged in)
      try {
        await userAPI.updateLanguagePreference(newLang);
      } catch (backendError) {
        console.warn('Failed to update language on backend:', backendError);
        // Continue anyway - local storage is more important
      }

      // Update state immediately
      setLanguageState(newLang);
      setRtl(isRTL());
      setLocale(getLocale());

      // Show alert and auto-reload on OK
      Alert.alert(
        newLang === 'ar' ? 'تم تغيير اللغة' : newLang === 'ku' ? 'Ziman hat guhertin' : 'Language Changed',
        newLang === 'ar' 
          ? 'سيتم إعادة تشغيل التطبيق لتطبيق التغييرات'
          : newLang === 'ku'
          ? 'Sepan dê ji nû ve dest pê bike da ku guhertin werin sepandin'
          : 'The app will restart to apply changes',
        [
          {
            text: newLang === 'ar' ? 'حسناً' : newLang === 'ku' ? 'Baş e' : 'OK',
            onPress: () => {
              Updates.reloadAsync().catch(() => {
                // Fallback: just update state if reload isn't available
                setLanguageState(newLang);
                setRtl(isRTL());
                setLocale(getLocale());
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(
        t('common.error'),
        'Failed to change language. Please try again.'
      );
    }
  };

  const value: LanguageContextType = {
    language,
    setLanguage: changeLanguage,
    t,
    isRTL: rtl,
    locale,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
