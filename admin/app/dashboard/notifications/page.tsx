'use client';

import { notificationsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Bell, Send } from 'lucide-react';
import { useState } from 'react';

export default function NotificationsPage() {
  const { t, isRTL } = useLanguage();
  const [form, setForm] = useState({
    user_id: '',
    title: '',
    body: '',
    type: 'GENERAL',
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
        type: form.type,
        data: parsedData,
      });

      alert('Notification sent successfully!');
      setForm({ user_id: '', title: '', body: '', type: 'GENERAL', data: '{}' });
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`mb-6 sm:mb-8 ${isRTL ? 'text-right' : ''}`}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.notifications.title}</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{isRTL ? 'إرسال إشعارات يدوية للمستخدمين' : 'Send manual notifications to users'}</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className={`flex items-center gap-3 mb-4 sm:mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t.notifications.sendNotification}</h2>
              <p className="text-xs sm:text-sm text-gray-600">{isRTL ? 'إرسال إشعار فوري يدوياً' : 'Manually send a push notification'}</p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 sm:mb-2 ${isRTL ? 'text-right' : ''}`}>
                {isRTL ? 'معرف المستخدم' : 'User ID'}
              </label>
              <input
                type="number"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm sm:text-base ${isRTL ? 'text-right' : ''}`}
                placeholder={isRTL ? 'أدخل معرف المستخدم' : 'Enter user ID'}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.notifications.notificationTitle}
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                placeholder={isRTL ? 'عنوان الإشعار' : 'Notification title'}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.notifications.notificationBody}
              </label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                rows={4}
                placeholder={isRTL ? 'نص الإشعار' : 'Notification message'}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t.notifications.notificationType}
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
              >
                <option value="GENERAL">{isRTL ? 'عام' : 'General'}</option>
                <option value="REPORT_STATUS">{isRTL ? 'حالة البلاغ' : 'Report Status'}</option>
                <option value="COUPON">{isRTL ? 'قسيمة' : 'Coupon'}</option>
                <option value="ACHIEVEMENT">{isRTL ? 'إنجاز' : 'Achievement'}</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {isRTL ? 'البيانات (JSON)' : 'Data (JSON)'}
              </label>
              <textarea
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm ${isRTL ? 'text-left' : ''}`}
                dir="ltr"
                rows={4}
                placeholder='{"key": "value"}'
              />
              <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
                {isRTL ? 'بيانات إضافية لإرسالها مع الإشعار (يجب أن تكون JSON صالحة)' : 'Additional data to send with the notification (must be valid JSON)'}
              </p>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !form.user_id || !form.title || !form.body}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Send className="w-5 h-5" />
              {sending 
                ? (isRTL ? 'جاري الإرسال...' : 'Sending...') 
                : (isRTL ? 'إرسال الإشعار' : 'Send Notification')}
            </button>
          </div>
        </div>

        <div className={`mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 ${isRTL ? 'text-right' : ''}`}>
          <h3 className="font-semibold text-blue-900 mb-2">{isRTL ? '💡 نصائح' : '💡 Tips'}</h3>
          <ul className={`text-sm text-blue-800 space-y-1 ${isRTL ? 'pr-4' : 'pl-4'}`}>
            {isRTL ? (
              <>
                <li>• تأكد من أن المستخدم قد سجل رمز جهازه</li>
                <li>• يجب أن تكون الإشعارات مفعلة للمستخدم</li>
                <li>• اختبر بمعرف المستخدم الخاص بك أولاً</li>
                <li>• اجعل الرسائل قصيرة وواضحة</li>
              </>
            ) : (
              <>
                <li>• Make sure the user has registered their device token</li>
                <li>• The user must have push notifications enabled</li>
                <li>• Test with your own user ID first</li>
                <li>• Keep messages short and clear</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
