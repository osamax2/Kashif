'use client';

import { notificationsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Bell, Building2, Landmark, Send, User, Users } from 'lucide-react';
import { useState } from 'react';

type SendMode = 'single' | 'broadcast';
type TargetRole = 'ALL' | 'USER' | 'COMPANY' | 'GOVERNMENT';

export default function NotificationsPage() {
  const { t, isRTL } = useLanguage();
  const [sendMode, setSendMode] = useState<SendMode>('single');
  const [form, setForm] = useState({
    user_id: '',
    title: '',
    body: '',
    type: 'GENERAL',
    data: '{}',
  });
  const [targetRole, setTargetRole] = useState<TargetRole>('ALL');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendSingle = async () => {
    try {
      setSending(true);
      setResult(null);
      
      let parsedData = {};
      try {
        parsedData = JSON.parse(form.data);
      } catch (e) {
        setResult({ success: false, message: isRTL ? 'JSON غير صالح في حقل البيانات' : 'Invalid JSON in data field' });
        return;
      }

      await notificationsAPI.sendNotification({
        user_id: parseInt(form.user_id),
        title: form.title,
        body: form.body,
        type: form.type,
        data: parsedData,
      });

      setResult({ success: true, message: isRTL ? 'تم إرسال الإشعار بنجاح!' : 'Notification sent successfully!' });
      setForm({ user_id: '', title: '', body: '', type: 'GENERAL', data: '{}' });
    } catch (error: any) {
      console.error('Failed to send notification:', error);
      setResult({ success: false, message: error?.response?.data?.detail || (isRTL ? 'فشل إرسال الإشعار' : 'Failed to send notification') });
    } finally {
      setSending(false);
    }
  };

  const handleBroadcast = async () => {
    try {
      setSending(true);
      setResult(null);

      const response = await notificationsAPI.broadcastNotification({
        title: form.title,
        body: form.body,
        type: form.type,
        target_role: targetRole === 'ALL' ? null : targetRole,
      });

      const successMsg = isRTL 
        ? `تم الإرسال إلى ${response.sent_count} مستخدم من أصل ${response.total_users}`
        : `Sent to ${response.sent_count} of ${response.total_users} users`;
      
      setResult({ success: true, message: successMsg });
      setForm({ ...form, title: '', body: '' });
    } catch (error: any) {
      console.error('Failed to broadcast notification:', error);
      setResult({ success: false, message: error?.response?.data?.detail || (isRTL ? 'فشل إرسال الإشعار الجماعي' : 'Failed to broadcast notification') });
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (sendMode === 'single') {
      handleSendSingle();
    } else {
      handleBroadcast();
    }
  };

  const roleOptions: { value: TargetRole; labelEn: string; labelAr: string; icon: any; color: string }[] = [
    { value: 'ALL', labelEn: 'All Users', labelAr: 'جميع المستخدمين', icon: Users, color: 'bg-purple-500' },
    { value: 'USER', labelEn: 'Regular Users', labelAr: 'المستخدمين العاديين', icon: User, color: 'bg-blue-500' },
    { value: 'COMPANY', labelEn: 'Company Users', labelAr: 'مستخدمي الشركات', icon: Building2, color: 'bg-orange-500' },
    { value: 'GOVERNMENT', labelEn: 'Government Employees', labelAr: 'الموظفين الحكوميين', icon: Landmark, color: 'bg-green-500' },
  ];

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`mb-6 sm:mb-8 ${isRTL ? 'text-right' : ''}`}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.notifications.title}</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{isRTL ? 'إرسال إشعارات يدوية للمستخدمين' : 'Send manual notifications to users'}</p>
      </div>

      <div className="max-w-2xl">
        {/* Mode Toggle */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setSendMode('single')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
                sendMode === 'single'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <User className="w-5 h-5" />
              {isRTL ? 'إرسال لمستخدم واحد' : 'Send to Single User'}
            </button>
            <button
              onClick={() => setSendMode('broadcast')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition ${
                sendMode === 'broadcast'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Users className="w-5 h-5" />
              {isRTL ? 'إرسال جماعي' : 'Broadcast to Group'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className={`flex items-center gap-3 mb-4 sm:mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {sendMode === 'single' 
                  ? t.notifications.sendNotification 
                  : (isRTL ? 'إرسال إشعار جماعي' : 'Broadcast Notification')}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                {sendMode === 'single'
                  ? (isRTL ? 'إرسال إشعار فوري يدوياً' : 'Manually send a push notification')
                  : (isRTL ? 'إرسال إشعار لمجموعة من المستخدمين' : 'Send notification to a group of users')}
              </p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* Single User ID - Only for single mode */}
            {sendMode === 'single' && (
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
            )}

            {/* Target Role Selection - Only for broadcast mode */}
            {sendMode === 'broadcast' && (
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'إرسال إلى' : 'Send To'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTargetRole(option.value)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition ${
                        targetRole === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`${option.color} p-2 rounded-lg`}>
                        <option.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`text-sm font-medium ${targetRole === option.value ? 'text-primary' : 'text-gray-700'}`}>
                        {isRTL ? option.labelAr : option.labelEn}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Data JSON - Only for single mode */}
            {sendMode === 'single' && (
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
            )}

            {/* Result Message */}
            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'} ${isRTL ? 'text-right' : ''}`}>
                  {result.message}
                </p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !form.title || !form.body || (sendMode === 'single' && !form.user_id)}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Send className="w-5 h-5" />
              {sending 
                ? (isRTL ? 'جاري الإرسال...' : 'Sending...') 
                : sendMode === 'single'
                  ? (isRTL ? 'إرسال الإشعار' : 'Send Notification')
                  : (isRTL ? 'إرسال للجميع' : 'Broadcast Now')}
            </button>
          </div>
        </div>

        <div className={`mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 ${isRTL ? 'text-right' : ''}`}>
          <h3 className="font-semibold text-blue-900 mb-2">{isRTL ? '💡 نصائح' : '💡 Tips'}</h3>
          <ul className={`text-sm text-blue-800 space-y-1 ${isRTL ? 'pr-4' : 'pl-4'}`}>
            {isRTL ? (
              <>
                <li>• تأكد من أن المستخدمين قد سجلوا أجهزتهم</li>
                <li>• يجب أن تكون الإشعارات مفعلة للمستخدمين</li>
                <li>• الإرسال الجماعي يرسل لجميع المستخدمين من النوع المحدد</li>
                <li>• اجعل الرسائل قصيرة وواضحة</li>
              </>
            ) : (
              <>
                <li>• Make sure users have registered their device tokens</li>
                <li>• Users must have push notifications enabled</li>
                <li>• Broadcast sends to all users of the selected type</li>
                <li>• Keep messages short and clear</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
