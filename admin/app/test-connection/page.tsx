'use client';

import { useState } from 'react';

export default function TestConnection() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing...');

    try {
      // Test 1: Fetch API
      const response = await fetch('https://api.kashifroad.com/health', {
        method: 'GET',
      });
      const text = await response.text();
      setResult(`✅ SUCCESS!\n\nStatus: ${response.status}\nResponse: ${text}`);
    } catch (error: any) {
      setResult(`❌ ERROR!\n\n${error.message}\n\nDetails:\n${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing login...');

    try {
      const formData = new URLSearchParams();
      formData.append('username', 'admin@kashif.com');
      formData.append('password', 'admin123');

      const response = await fetch('https://api.kashifroad.com/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();
      setResult(`✅ LOGIN SUCCESS!\n\nStatus: ${response.status}\n\nToken: ${data.access_token?.substring(0, 50)}...`);
    } catch (error: any) {
      setResult(`❌ LOGIN ERROR!\n\n${error.message}\n\nDetails:\n${JSON.stringify(error, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Connection Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-4">
          <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
          <div className="font-mono text-sm">
            <p><strong>API Base URL:</strong> https://api.kashifroad.com</p>
            <p><strong>Admin Panel:</strong> https://admin.kashifroad.com</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-4">
          <h2 className="text-xl font-semibold mb-4">Tests</h2>
          <div className="space-y-4">
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 mr-4"
            >
              Test Health Endpoint
            </button>
            <button
              onClick={testLogin}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              Test Login
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-gray-900 text-green-400 p-6 rounded-lg shadow font-mono text-sm whitespace-pre-wrap">
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
