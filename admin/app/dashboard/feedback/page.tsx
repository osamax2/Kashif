'use client';

import { feedbackAPI, usersAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Feedback } from '@/lib/types';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  Filter,
  Lightbulb,
  MessageSquare,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserMap {
  [key: number]: { full_name: string; email: string };
}

const CATEGORY_CONFIG = {
  bug: { icon: Bug, color: 'text-red-600', bg: 'bg-red-100' },
  suggestion: { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  complaint: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
  other: { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-100' },
};

const STATUS_CONFIG = {
  new: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100', label_en: 'New', label_ar: 'جديد' },
  in_progress: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label_en: 'In Progress', label_ar: 'قيد المعالجة' },
  resolved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label_en: 'Resolved', label_ar: 'تم الحل' },
  dismissed: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-100', label_en: 'Dismissed', label_ar: 'مرفوض' },
};

function getCategoryLabel(cat: string, isRTL: boolean) {
  const labels: Record<string, { en: string; ar: string }> = {
    bug: { en: 'Bug', ar: 'خلل' },
    suggestion: { en: 'Suggestion', ar: 'اقتراح' },
    complaint: { en: 'Complaint', ar: 'شكوى' },
    other: { en: 'Other', ar: 'أخرى' },
  };
  return isRTL ? labels[cat]?.ar || cat : labels[cat]?.en || cat;
}

function formatDate(dateStr: string, isRTL: boolean) {
  try {
    return new Date(dateStr).toLocaleDateString(isRTL ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/* Feedback list item */
function FeedbackListItem({
  fb,
  isSelected,
  user,
  isRTL,
  onSelect,
}: Readonly<{
  fb: Feedback;
  isSelected: boolean;
  user?: { full_name: string; email: string };
  isRTL: boolean;
  onSelect: () => void;
}>) {
  const catConfig = CATEGORY_CONFIG[fb.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other;
  const statusConfig = STATUS_CONFIG[fb.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.new;
  const CatIcon = catConfig.icon;
  const StatusIcon = statusConfig.icon;

  return (
    <button
      type="button"
      className={`w-full text-left p-4 hover:bg-gray-50 cursor-pointer transition ${
        isSelected ? 'bg-blue-50 border-l-4 border-primary' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${catConfig.bg} ${catConfig.color}`}>
              <CatIcon className="w-3 h-3" />
              {getCategoryLabel(fb.category, isRTL)}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              <StatusIcon className="w-3 h-3" />
              {isRTL ? statusConfig.label_ar : statusConfig.label_en}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{fb.subject}</h3>
          <p className="text-sm text-gray-500 truncate mt-1">{fb.message}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{user?.full_name || `User #${fb.user_id}`}</span>
            <span>·</span>
            <span>{formatDate(fb.created_at, isRTL)}</span>
          </div>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">#{fb.id}</span>
      </div>
    </button>
  );
}

/* Detail panel */
function FeedbackDetailPanel({
  feedback,
  user,
  isRTL,
  updating,
  adminNotes,
  onAdminNotesChange,
  onStatusUpdate,
  onSaveNotes,
}: Readonly<{
  feedback: Feedback;
  user?: { full_name: string; email: string };
  isRTL: boolean;
  updating: boolean;
  adminNotes: string;
  onAdminNotesChange: (v: string) => void;
  onStatusUpdate: (id: number, status: string) => void;
  onSaveNotes: () => void;
}>) {
  const catConfig = CATEGORY_CONFIG[feedback.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other;
  const CatIcon = catConfig.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-4">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-bold text-lg text-gray-900">{feedback.subject}</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${catConfig.bg} ${catConfig.color}`}>
            <CatIcon className="w-3 h-3" />
            {getCategoryLabel(feedback.category, isRTL)}
          </span>
          <span className="text-xs text-gray-400">#{feedback.id}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">{isRTL ? 'المستخدم' : 'User'}</p>
          <p className="text-sm font-medium text-gray-900">{user?.full_name || `User #${feedback.user_id}`}</p>
          <p className="text-xs text-gray-500">{user?.email || ''}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">{isRTL ? 'الرسالة' : 'Message'}</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">{feedback.message}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">{isRTL ? 'التاريخ' : 'Date'}</p>
          <p className="text-sm text-gray-700">{formatDate(feedback.created_at, isRTL)}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">{isRTL ? 'تحديث الحالة' : 'Update Status'}</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const isActive = feedback.status === key;
              return (
                <button
                  key={key}
                  disabled={updating || isActive}
                  onClick={() => onStatusUpdate(feedback.id, key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? `${config.bg} ${config.color} ring-2 ring-offset-1 ring-current`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {isRTL ? config.label_ar : config.label_en}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1">{isRTL ? 'ملاحظات المشرف' : 'Admin Notes'}</p>
          <textarea
            value={adminNotes}
            onChange={(e) => onAdminNotesChange(e.target.value)}
            placeholder={isRTL ? 'اكتب ملاحظاتك هنا...' : 'Write your notes here...'}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
          <button
            onClick={onSaveNotes}
            disabled={updating}
            className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition text-sm disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isRTL ? 'حفظ الملاحظات' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Stats cards */
function StatsCards({ isRTL, counts, statusFilter, onToggleFilter }: Readonly<{
  isRTL: boolean;
  counts: { new: number; in_progress: number; resolved: number; dismissed: number };
  statusFilter: string;
  onToggleFilter: (status: string) => void;
}>) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button type="button" className="bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition text-left" onClick={() => onToggleFilter('new')}>
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">{isRTL ? 'جديد' : 'New'}</span>
        </div>
        <p className="text-2xl font-bold text-blue-900">{counts.new}</p>
      </button>
      <button type="button" className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition text-left" onClick={() => onToggleFilter('in_progress')}>
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-yellow-600" />
          <span className="text-sm font-medium text-yellow-800">{isRTL ? 'قيد المعالجة' : 'In Progress'}</span>
        </div>
        <p className="text-2xl font-bold text-yellow-900">{counts.in_progress}</p>
      </button>
      <button type="button" className="bg-green-50 border border-green-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition text-left" onClick={() => onToggleFilter('resolved')}>
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">{isRTL ? 'تم الحل' : 'Resolved'}</span>
        </div>
        <p className="text-2xl font-bold text-green-900">{counts.resolved}</p>
      </button>
      <button type="button" className="bg-gray-50 border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition text-left" onClick={() => onToggleFilter('dismissed')}>
        <div className="flex items-center gap-2 mb-1">
          <XCircle className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{isRTL ? 'مرفوض' : 'Dismissed'}</span>
        </div>
        <p className="text-2xl font-bold text-gray-800">{counts.dismissed}</p>
      </button>
    </div>
  );
}

/* Filters bar */
function FiltersBar({ isRTL, searchQuery, categoryFilter, statusFilter, onSearchChange, onCategoryChange, onClear }: Readonly<{
  isRTL: boolean;
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onClear: () => void;
}>) {
  const hasFilters = statusFilter || categoryFilter || searchQuery;
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder={isRTL ? 'بحث في الملاحظات...' : 'Search feedback...'} value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
      </div>
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <select value={categoryFilter} onChange={(e) => onCategoryChange(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm">
          <option value="">{isRTL ? 'كل الفئات' : 'All Categories'}</option>
          <option value="bug">{isRTL ? 'خلل' : 'Bug'}</option>
          <option value="suggestion">{isRTL ? 'اقتراح' : 'Suggestion'}</option>
          <option value="complaint">{isRTL ? 'شكوى' : 'Complaint'}</option>
          <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
        </select>
      </div>
      {hasFilters && (
        <button onClick={onClear} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">
          {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
        </button>
      )}
    </div>
  );
}

function filterFeedbacks(feedbacks: Feedback[], users: UserMap, statusFilter: string, categoryFilter: string, searchQuery: string) {
  return feedbacks.filter((f) => {
    if (statusFilter && f.status !== statusFilter) return false;
    if (categoryFilter && f.category !== categoryFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const user = users[f.user_id];
    return (
      f.subject.toLowerCase().includes(q) ||
      f.message.toLowerCase().includes(q) ||
      (user?.full_name || '').toLowerCase().includes(q) ||
      (user?.email || '').toLowerCase().includes(q)
    );
  });
}

export default function FeedbackPage() {
  const { isRTL } = useLanguage();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const counts = {
    new: feedbacks.filter((f) => f.status === 'new').length,
    in_progress: feedbacks.filter((f) => f.status === 'in_progress').length,
    resolved: feedbacks.filter((f) => f.status === 'resolved').length,
    dismissed: feedbacks.filter((f) => f.status === 'dismissed').length,
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedbackData, usersData] = await Promise.all([
        feedbackAPI.getAll({ limit: 500 }),
        usersAPI.getUsers(0, 1000),
      ]);
      setFeedbacks(feedbackData);
      const uMap: UserMap = {};
      const usersList = usersData.users || usersData;
      if (Array.isArray(usersList)) {
        usersList.forEach((u: any) => {
          uMap[u.id] = { full_name: u.full_name, email: u.email };
        });
      }
      setUsers(uMap);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = filterFeedbacks(feedbacks, users, statusFilter, categoryFilter, searchQuery);

  const handleStatusUpdate = async (feedbackId: number, newStatus: string) => {
    setUpdating(true);
    try {
      await feedbackAPI.update(feedbackId, { status: newStatus });
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status: newStatus as Feedback['status'] } : f))
      );
      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback((prev) => (prev ? { ...prev, status: newStatus as Feedback['status'] } : null));
      }
    } catch (error) {
      console.error('Error updating feedback status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedFeedback) return;
    setUpdating(true);
    try {
      await feedbackAPI.update(selectedFeedback.id, { admin_notes: adminNotes });
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === selectedFeedback.id ? { ...f, admin_notes: adminNotes } : f))
      );
      setSelectedFeedback((prev) => (prev ? { ...prev, admin_notes: adminNotes } : null));
    } catch (error) {
      console.error('Error saving admin notes:', error);
    } finally {
      setUpdating(false);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(statusFilter === status ? '' : status);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setCategoryFilter('');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquareText className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">
            {isRTL ? 'ملاحظات المستخدمين' : 'User Feedback'}
          </h1>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition"
        >
          <RefreshCw className="w-4 h-4" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      <StatsCards isRTL={isRTL} counts={counts} statusFilter={statusFilter} onToggleFilter={toggleStatusFilter} />
      <FiltersBar isRTL={isRTL} searchQuery={searchQuery} categoryFilter={categoryFilter} statusFilter={statusFilter} onSearchChange={setSearchQuery} onCategoryChange={setCategoryFilter} onClear={clearFilters} />

      {/* Feedback Table + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-600">
                {isRTL
                  ? `${filteredFeedbacks.length} ملاحظة من ${feedbacks.length}`
                  : `${filteredFeedbacks.length} of ${feedbacks.length} feedback items`}
              </p>
            </div>
            {filteredFeedbacks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquareText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>{isRTL ? 'لا توجد ملاحظات' : 'No feedback found'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredFeedbacks.map((fb) => (
                  <FeedbackListItem
                    key={fb.id}
                    fb={fb}
                    isSelected={selectedFeedback?.id === fb.id}
                    user={users[fb.user_id]}
                    isRTL={isRTL}
                    onSelect={() => {
                      setSelectedFeedback(fb);
                      setAdminNotes(fb.admin_notes || '');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          {selectedFeedback ? (
            <FeedbackDetailPanel
              feedback={selectedFeedback}
              user={users[selectedFeedback.user_id]}
              isRTL={isRTL}
              updating={updating}
              adminNotes={adminNotes}
              onAdminNotesChange={setAdminNotes}
              onStatusUpdate={handleStatusUpdate}
              onSaveNotes={handleSaveNotes}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
              <MessageSquareText className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm">
                {isRTL ? 'اختر ملاحظة لعرض التفاصيل' : 'Select a feedback item to view details'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
