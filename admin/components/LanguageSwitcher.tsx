'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Globe } from 'lucide-react';

type LanguageSwitcherProps = {
  className?: string;
  variant?: 'default' | 'button';
};

const LANGUAGE_LABELS = {
  en: 'English',
  ar: 'العربية',
  ku: 'kurdî',
} as const;

export default function LanguageSwitcher({ className = '', variant = 'default' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const baseWidth = variant === 'button' ? 'w-[170px]' : 'w-full';

  return (
    <div ref={containerRef} className={`relative ${baseWidth} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full h-8 rounded-md border border-[#B2C7E1] bg-[#D3E2F2] text-[#2E5E92] text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#DCE8F5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#AFC7E3]"
      >
        <span>{LANGUAGE_LABELS[language]}</span>
        <Globe className="w-[13px] h-[13px] text-[#2E5E92]" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-md border border-[#B2C7E1] bg-white shadow-lg overflow-hidden z-[60]">
          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              setOpen(false);
            }}
            className={`w-full h-8 px-3 text-sm text-center ${language === 'en' ? 'bg-[#E8F1FA] text-[#2E5E92] font-semibold' : 'text-[#2E5E92] hover:bg-[#F1F6FC]'}`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage('ar');
              setOpen(false);
            }}
            className={`w-full h-8 px-3 text-sm text-center ${language === 'ar' ? 'bg-[#E8F1FA] text-[#2E5E92] font-semibold' : 'text-[#2E5E92] hover:bg-[#F1F6FC]'}`}
          >
            العربية
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage('ku');
              setOpen(false);
            }}
            className={`w-full h-8 px-3 text-sm text-center ${language === 'ku' ? 'bg-[#E8F1FA] text-[#2E5E92] font-semibold' : 'text-[#2E5E92] hover:bg-[#F1F6FC]'}`}
          >
            kurdî
          </button>
        </div>
      )}
    </div>
  );
}
