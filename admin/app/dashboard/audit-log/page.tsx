'use client';

import { auditAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { AuditLog } from '@/lib/types';
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Edit,
    FileText,
    Filter,
    Key,
    RefreshCw,
    RotateCcw,
    Shield,
    Trash2,
    User,
    UserPlus,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const ACTION_ICONS: Record<string, any> = {
  'user.create_admin': UserPlus,
  'user.create_company': UserPlus,
  'user.create_government': UserPlus,
  'user.create_normal': UserPlus,
  'user.update': Edit,
  'user.delete': Trash2,
  'user.permanent_delete': Trash2,
  'user.restore': RotateCcw,
  'user.reset_password': Key,
  'user.bulk_status': Users,
};

const ACTION_COLORS: Record<string, string> = {
  'user.create_admin': 'bg-green-100 text-green-700',
  'user.create_company': 'bg-green-100 text-green-700',
  'user.create_government': 'bg-green-100 text-green-700',
  'user.create_normal': 'bg-green-100 text-green-700',
  'user.update': 'bg-blue-100 text-blue-700',
  'user.delete': 'bg-red-100 text-red-700',
  'user.permanent_delete': 'bg-red-200 text-red-800',
  'user.restore': 'bg-amber-100 text-amber-700',
  'user.reset_password': 'bg-purple-100 text-purple-700',
  'user.bulk_status': 'bg-indigo-100 text-indigo-700',
};

export default function AuditLogPage() {
  const { isRTL } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const limit = 25;

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { skip: page * limit, limit };
      if (actionFilter) params.action = actionFilter;
      const data = await auditAPI.getLogs(params);
      setLogs(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      'user.create_admin': { en: 'Create Admin', ar: 'إنشاء مدير' },
      'user.create_company': { en: 'Create Company User', ar: 'إنشاء مستخدم شركة' },
      'user.create_government': { en: 'Create Gov User', ar: 'إنشاء مستخدم حكومي' },
      'user.create_normal': { en: 'Create User', ar: 'إنشاء مستخدم' },
      'user.update': { en: 'Update User', ar: 'تحديث مستخدم' },
      'user.delete': { en: 'Delete User', ar: 'حذف مستخدم' },
      'user.permanent_delete': { en: 'Permanent Delete', ar: 'حذف نهائي' },
      'user.restore': { en: 'Restore User', ar: 'استعادة مستخدم' },
      'user.reset_password': { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور' },
      'user.bulk_status': { en: 'Bulk Status Update', ar: 'تحديث حالة جماعي' },
    };
    return labels[action]?.[isRTL ? 'ar' : 'en'] || action;
  };

  const uniqueActions = [
    'user.create_admin',
    'user.create_company',
    'user.create_government',
    'user.create_normal',
    'user.update',
    'user.delete',
    'user.permanent_delete',
    'user.restore',
    'user.reset_password',
    'user.bulk_status',
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isRTL ? 'سجل التدقيق' : 'Audit Log'}
            </h1>
            <p className="text-gray-500 text-sm">
              {isRTL ? 'تتبع جميع الإجراءات الإدارية' : 'Track all administrative actions'}
            </p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {isRTL ? 'تصفية حسب الإجراء:' : 'Filter by action:'}
            </span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">{isRTL ? 'جميع الإجراءات' : 'All Actions'}</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {getActionLabel(action)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">
            {isRTL ? 'لا توجد سجلات' : 'No audit logs found'}
          </h3>
          <p className="text-gray-400 mt-1">
            {isRTL ? 'ستظهر الإجراءات الإدارية هنا' : 'Administrative actions will appear here'}
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      {isRTL ? 'الوقت' : 'Time'}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      {isRTL ? 'الإجراء' : 'Action'}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      {isRTL ? 'المستخدم' : 'Performed By'}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      {isRTL ? 'الهدف' : 'Target'}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      {isRTL ? 'التفاصيل' : 'Details'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => {
                    const IconComponent = ACTION_ICONS[log.action] || FileText;
                    const colorClass = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700';
                    return (
                      <tr key={log.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                            <IconComponent className="w-3.5 h-3.5" />
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <span className="text-sm text-gray-700">{log.user_email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.target_type && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                              {log.target_type} #{log.target_id}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {log.details || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              {isRTL ? `صفحة ${page + 1}` : `Page ${page + 1}`}
              {logs.length < limit && ` — ${isRTL ? 'الصفحة الأخيرة' : 'Last page'}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={logs.length < limit}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
