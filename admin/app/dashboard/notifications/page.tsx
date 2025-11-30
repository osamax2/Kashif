'use client';

import { notificationsAPI } from '@/lib/api';
import { Bell, Send } from 'lucide-react';
import { useState } from 'react';

export default function NotificationsPage() {
  const [form, setForm] = useState({
    user_id: '',
    title: '',
    body: '',
    data: '{}',
  });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    try {
      setSending(true);
      let parsedData = {};
      try {
        parsedData = JSON.parse(form.data);
      } catch (e) {
        alert('Invalid JSON in data field');
        return;
      }

      await notificationsAPI.sendNotification({
        user_id: parseInt(form.user_id),
        title: form.title,
        body: form.body,
        data: parsedData,
      });

      alert('Notification sent successfully!');
      setForm({ user_id: '', title: '', body: '', data: '{}' });
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Notification Management</h1>
        <p className="text-gray-600 mt-2">Send manual notifications to users</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Send Notification</h2>
              <p className="text-sm text-gray-600">Manually send a push notification</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="number"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Enter user ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Notification title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Body
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                rows={4}
                placeholder="Notification message"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data (JSON)
              </label>
              <textarea
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm"
                rows={4}
                placeholder='{"key": "value"}'
              />
              <p className="text-xs text-gray-500 mt-1">
                Additional data to send with the notification (must be valid JSON)
              </p>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !form.user_id || !form.title || !form.body}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Make sure the user has registered their device token</li>
            <li>• The user must have push notifications enabled</li>
            <li>• Test with your own user ID first</li>
            <li>• Keep messages short and clear</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
