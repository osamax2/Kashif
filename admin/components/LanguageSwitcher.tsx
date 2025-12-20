'use client';

import { useLanguage } from '@/lib/i18n';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'icon' | 'button' | 'dropdown';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'button', className = '' }: LanguageSwitcherProps) {
  const { language, toggleLanguage, isRTL } = useLanguage();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleLanguage}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition ${className}`}
        title={language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
      >
        <Globe className="w-5 h-5" />
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block ${className}`}>
        <select
          value={language}
          onChange={(e) => toggleLanguage()}
          className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
        <Globe className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
      </div>
    );
  }

  // Default: button variant
  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition font-medium ${className}`}
    >
      <Globe className="w-4 h-4" />
      <span>{language === 'en' ? 'العربية' : 'English'}</span>
    </button>
  );
}
