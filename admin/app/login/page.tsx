'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
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
      
      // Verify user is admin
      console.log('Fetching user profile...');
      const profile = await authAPI.getProfile();
      console.log('Profile:', profile);
      
      if (profile.role !== 'ADMIN') {
        setError('Access denied. Admin role required.');
        localStorage.removeItem('admin_token');
        return;
      }
      
      console.log('Redirecting to dashboard...');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-blue-900">
      {/* Cache bust: v2 - API Proxy enabled */}
      
      {/* Dev Mode: API Status Indicator */}
      <div className="fixed top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-lg text-xs">
        <div className="font-mono">
          <div className="text-gray-500">API Mode:</div>
          <div className="font-bold text-green-600">Next.js Proxy</div>
          <div className="text-gray-400 mt-1">v2.0</div>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Kashif Admin</h1>
          <p className="text-gray-600">Sign in to manage the platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="admin@kashif.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
              {error.includes('Network Error') || error.includes('CORS') ? (
                <div className="mt-2 pt-2 border-t border-red-200 text-xs">
                  <strong>🔧 Cache Problem detected!</strong>
                  <br />
                  Press <kbd className="bg-red-100 px-1 rounded">Cmd+Shift+R</kbd> (Mac) 
                  or <kbd className="bg-red-100 px-1 rounded">Ctrl+Shift+R</kbd> (Windows)
                  to reload without cache.
                </div>
              ) : null}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-900 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Admin access only</p>
        </div>
      </div>
    </div>
  );
}
