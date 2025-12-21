'use client';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import { authAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔄 LOGIN v2.0 - Using Next.js Proxy');
      console.log('Attempting login with:', email);
      const data = await authAPI.login(email, password);
      console.log('Login successful, token received');
      localStorage.setItem('admin_token', data.access_token);
      
      // Verify user role (ADMIN or COMPANY allowed)
      console.log('Fetching user profile...');
      const profile = await authAPI.getProfile();
      console.log('Profile:', profile);
      
      if (profile.role !== 'ADMIN' && profile.role !== 'COMPANY' && profile.role !== 'GOVERNMENT') {
        setError(t.errors.unauthorized);
        localStorage.removeItem('admin_token');
        return;
      }
      
      // Store user profile and role for role-based access
      localStorage.setItem('user_profile', JSON.stringify(profile));
      localStorage.setItem('user_role', profile.role);
      
      console.log('Redirecting to dashboard...');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMsg = err.response?.data?.detail || err.message || t.auth.invalidCredentials;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-blue-900" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Language Switcher */}
      <div className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
        <LanguageSwitcher variant="button" />
      </div>
      
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md mx-4 sm:mx-0">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">{t.auth.loginTitle}</h1>
          <p className="text-gray-600 text-sm sm:text-base">{t.auth.loginSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
              {t.auth.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition ${isRTL ? 'text-right' : ''}`}
              placeholder="admin@kashif.com"
            />
          </div>

          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
              {t.auth.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition ${isRTL ? 'text-right' : ''}`}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm ${isRTL ? 'text-right' : ''}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-900 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.common.loading : t.auth.login}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>{isRTL ? 'وصول المشرفين فقط' : 'Admin access only'}</p>
        </div>
      </div>
    </div>
  );
}
