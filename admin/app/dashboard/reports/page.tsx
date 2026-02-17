'use client';

import { donationsAPI, reportsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Report, ReportStatusHistory } from '@/lib/types';
import { Calendar, CheckSquare, DollarSign, Download, History, MapPin, RotateCcw, Search, Settings, Share2, Square, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Helper function to extract photo URL from photo_urls field
// Prefers AI annotated image if available
function getPhotoUrl(photoUrls: string | null | undefined, aiAnnotatedUrl?: string | null): string | null {
  // First, check if we have an AI annotated URL
  if (aiAnnotatedUrl) {
    const url = aiAnnotatedUrl.trim();
    if (url.startsWith('/uploads/')) {
      return `/api/reports${url}`;
    }
    if (url.startsWith('uploads/')) {
      return `/api/reports/${url}`;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname.startsWith('/api/reports')) {
          return parsedUrl.pathname;
        }
        return `/api/reports${parsedUrl.pathname}`;
      } catch {
        return null;
      }
    }
    if (url.startsWith('/')) {
      return `/api/reports${url}`;
    }
  }
  
  // Fall back to photo_urls
  if (!photoUrls) return null;
  
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(photoUrls);
    
    // Check for different URL formats in order of preference
    // 1. annotated (with pothole markings)
    // 2. photo (original uploaded photo)
    // 3. url (legacy format)
    const photoPath = parsed.annotated || parsed.photo || parsed.url;
    
    if (!photoPath) return null;
    
    // If it's already an absolute URL with http/https, route through proxy
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      // Extract path from full URL and use proxy
      try {
        const url = new URL(photoPath);
        // If pathname already contains /api/reports, just use it
        if (url.pathname.startsWith('/api/reports')) {
          return url.pathname;
        }
        return `/api/reports${url.pathname}`;
      } catch {
        return null;
      }
    }
    
    // If it's a relative path like /uploads/xxx.jpg, use proxy
    if (photoPath.startsWith('/uploads/')) {
      return `/api/reports${photoPath}`;
    }
    
    // If it's just the path without leading slash
    if (photoPath.startsWith('uploads/')) {
      return `/api/reports/${photoPath}`;
    }
    
    return null;
  } catch {
    // If not valid JSON, check if it's a direct URL
    if (photoUrls.startsWith('/uploads/')) {
      return `/api/reports${photoUrls}`;
    }
    if (photoUrls.startsWith('http')) {
      try {
        const url = new URL(photoUrls);
        // If pathname already contains /api/reports, just use it
        if (url.pathname.startsWith('/api/reports')) {
          return url.pathname;
        }
        return `/api/reports${url.pathname}`;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export default function ReportsPage() {
  const { t, isRTL } = useLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [deletedReports, setDeletedReports] = useState<Report[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [statuses, setStatuses] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status_id: 1,
  });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkComment, setBulkComment] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Repair cost state
  const [showRepairCostModal, setShowRepairCostModal] = useState(false);
  const [repairCostReport, setRepairCostReport] = useState<Report | null>(null);
  const [repairCostValue, setRepairCostValue] = useState('');
  const [repairCostSaving, setRepairCostSaving] = useState(false);
  const [showBulkRepairCostModal, setShowBulkRepairCostModal] = useState(false);
  const [bulkRepairCostValue, setBulkRepairCostValue] = useState('');
  const [bulkRepairCostLoading, setBulkRepairCostLoading] = useState(false);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map(r => r.id)));
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    const statusObj = statuses.find((s: any) => s.name === bulkStatus);
    if (!statusObj) return;
    setBulkLoading(true);
    try {
      const result = await reportsAPI.bulkUpdateStatus(
        Array.from(selectedIds), statusObj.id, bulkComment
      );
      alert(result.message);
      setShowBulkStatusModal(false);
      setBulkComment('');
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      console.error('Bulk status update failed:', error);
      alert(isRTL ? 'فشل في التحديث الجماعي' : 'Bulk update failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmMsg = isRTL
      ? `هل تريد حذف ${selectedIds.size} تقرير؟`
      : `Delete ${selectedIds.size} reports?`;
    if (!confirm(confirmMsg)) return;
    setBulkLoading(true);
    try {
      const result = await reportsAPI.bulkDeleteReports(Array.from(selectedIds));
      alert(result.message);
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert(isRTL ? 'فشل في الحذف الجماعي' : 'Bulk delete failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRepairCostSave = async () => {
    if (!repairCostReport) return;
    setRepairCostSaving(true);
    try {
      await donationsAPI.updateRepairCost(repairCostReport.id, parseFloat(repairCostValue) || 0);
      setShowRepairCostModal(false);
      setRepairCostReport(null);
      loadData();
    } catch (error) {
      console.error('Failed to update repair cost:', error);
      alert(isRTL ? 'فشل في تحديث تكلفة الإصلاح' : 'Failed to update repair cost');
    } finally {
      setRepairCostSaving(false);
    }
  };

  const handleBulkRepairCostUpdate = async () => {
    if (selectedIds.size === 0 || !bulkRepairCostValue) return;
    setBulkRepairCostLoading(true);
    try {
      const cost = parseFloat(bulkRepairCostValue) || 0;
      const promises = Array.from(selectedIds).map(id =>
        donationsAPI.updateRepairCost(id, cost)
      );
      await Promise.all(promises);
      alert(isRTL ? `تم تحديث تكلفة الإصلاح لـ ${selectedIds.size} تقرير` : `Repair cost updated for ${selectedIds.size} reports`);
      setShowBulkRepairCostModal(false);
      setBulkRepairCostValue('');
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      console.error('Bulk repair cost update failed:', error);
      alert(isRTL ? 'فشل في التحديث الجماعي لتكلفة الإصلاح' : 'Bulk repair cost update failed');
    } finally {
      setBulkRepairCostLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = reports;
    
    if (statusFilter !== 'ALL') {
      const selectedStatus = statuses.find(s => s.name === statusFilter);
      if (selectedStatus) {
        filtered = filtered.filter((r) => r.status_id === selectedStatus.id);
      }
    }
    
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.category_id === parseInt(categoryFilter));
    }

    if (severityFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.severity_id === parseInt(severityFilter));
    }
    
    // Date filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.created_at);
        return reportDate >= fromDate;
      });
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.created_at);
        return reportDate <= toDate;
      });
    }
    
    // Time filter
    if (timeFrom) {
      const [fromHours, fromMinutes] = timeFrom.split(':').map(Number);
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.created_at);
        const reportMinutes = reportDate.getHours() * 60 + reportDate.getMinutes();
        const filterMinutes = fromHours * 60 + fromMinutes;
        return reportMinutes >= filterMinutes;
      });
    }
    
    if (timeTo) {
      const [toHours, toMinutes] = timeTo.split(':').map(Number);
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.created_at);
        const reportMinutes = reportDate.getHours() * 60 + reportDate.getMinutes();
        const filterMinutes = toHours * 60 + toMinutes;
        return reportMinutes <= filterMinutes;
      });
    }
    
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredReports(filtered);
  }, [search, statusFilter, categoryFilter, severityFilter, dateFrom, dateTo, timeFrom, timeTo, reports, statuses]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsData, statusesData, categoriesData] = await Promise.all([
        reportsAPI.getReports({ limit: 1000 }),
        reportsAPI.getStatuses(),
        reportsAPI.getCategories(),
      ]);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setFilteredReports(Array.isArray(reportsData) ? reportsData : []);
      setStatuses(Array.isArray(statusesData) ? statusesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedReports = async () => {
    try {
      setTrashLoading(true);
      const data = await reportsAPI.getDeletedReports();
      setDeletedReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load deleted reports:', error);
      setDeletedReports([]);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport || !newStatus) return;

    try {
      const status = statuses.find((s) => s.name === newStatus);
      if (!status) return;
      
      await reportsAPI.updateReportStatus(selectedReport.id, {
        status_id: status.id,
        admin_comment: comment,
      });
      alert('Status updated successfully!');
      setShowStatusModal(false);
      setComment('');
      loadData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    }
  };

  const handleEdit = (report: Report) => {
    setSelectedReport(report);
    setEditForm({
      title: report.title,
      description: report.description,
      status_id: report.status_id,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedReport) return;

    try {
      await reportsAPI.updateReport(selectedReport.id, editForm);
      alert('Report updated successfully!');
      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to update report:', error);
      alert('Failed to update report');
    }
  };

  const handleDelete = async () => {
    if (!selectedReport) return;

    try {
      await reportsAPI.deleteReport(selectedReport.id);
      alert(isRTL ? 'تم نقل التقرير إلى سلة المحذوفات!' : 'Report moved to trash!');
      setShowDeleteModal(false);
      setSelectedReport(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert(isRTL ? 'فشل في حذف التقرير' : 'Failed to delete report');
    }
  };

  const handleRestore = async (report: Report) => {
    try {
      await reportsAPI.restoreReport(report.id);
      alert(isRTL ? 'تم استعادة التقرير بنجاح!' : 'Report restored successfully!');
      loadDeletedReports();
      loadData();
    } catch (error) {
      console.error('Failed to restore report:', error);
      alert(isRTL ? 'فشل في استعادة التقرير' : 'Failed to restore report');
    }
  };

  const handleOpenTrash = () => {
    setShowTrash(true);
    loadDeletedReports();
  };

  const handleShowHistory = async (report: Report) => {
    setSelectedReport(report);
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const history = await reportsAPI.getReportHistory(report.id);
      setReportHistory(Array.isArray(history) ? history : []);
    } catch (error) {
      console.error('Failed to load history:', error);
      setReportHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getSeverityLabel = (severityId: number) => {
    switch (severityId) {
      case 1: return isRTL ? 'منخفض' : 'Low';
      case 2: return isRTL ? 'متوسط' : 'Medium';
      case 3: return isRTL ? 'عالي' : 'High';
      default: return isRTL ? 'غير محدد' : 'Unknown';
    }
  };

  const getSeverityColor = (severityId: number) => {
    switch (severityId) {
      case 1: return 'bg-green-100 text-green-700';
      case 2: return 'bg-yellow-100 text-yellow-700';
      case 3: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityIcon = (severityId: number) => {
    switch (severityId) {
      case 1: return '🟢';
      case 2: return '🟡';
      case 3: return '🔴';
      default: return '⚪';
    }
  };

  const getStatusColor = (statusName: string) => {
    switch (statusName) {
      case 'NEW':
        return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-700';
      case 'RESOLVED':
        return 'bg-green-100 text-green-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusName = (statusId: number) => {
    const status = statuses.find(s => s.id === statusId);
    return status ? status.name : 'UNKNOWN';
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'Unknown';
    return isRTL ? (category.name_ar || category.name) : category.name;
  };

  const [exporting, setExporting] = useState(false);

  const exportToCSV = async () => {
    try {
      setExporting(true);
      
      // Fetch history for all filtered reports
      const historyPromises = filteredReports.map(report => 
        reportsAPI.getReportHistory(report.id).catch(() => [])
      );
      const allHistories = await Promise.all(historyPromises);
      
      // Create a map of report id to history
      const historyMap: { [key: number]: ReportStatusHistory[] } = {};
      filteredReports.forEach((report, index) => {
        historyMap[report.id] = Array.isArray(allHistories[index]) ? allHistories[index] : [];
      });

      // CSV headers - now includes user info and history
      const headers = [
        'ID',
        isRTL ? 'معرف المستخدم' : 'User ID',
        isRTL ? 'اسم المبلغ' : 'Reporter Name',
        isRTL ? 'هاتف المبلغ' : 'Reporter Phone',
        isRTL ? 'بريد المبلغ' : 'Reporter Email',
        isRTL ? 'العنوان' : 'Title',
        isRTL ? 'الوصف' : 'Description',
        isRTL ? 'الفئة' : 'Category',
        isRTL ? 'الخطورة' : 'Severity',
        isRTL ? 'الحالة' : 'Status',
        isRTL ? 'العنوان' : 'Address',
        isRTL ? 'خط العرض' : 'Latitude',
        isRTL ? 'خط الطول' : 'Longitude',
        isRTL ? 'تاريخ الإنشاء' : 'Created At',
        isRTL ? 'سجل التغييرات' : 'Status History',
      ];

      // Format history for CSV
      const formatHistory = (history: ReportStatusHistory[]) => {
        if (!history || history.length === 0) return isRTL ? 'لا يوجد سجل' : 'No history';
        return history.map(h => {
          const date = new Date(h.created_at).toLocaleDateString();
          const oldStatus = h.old_status_id ? getStatusName(h.old_status_id) : (isRTL ? 'جديد' : 'New');
          const newStatus = getStatusName(h.new_status_id);
          const changedBy = h.changed_by_user_name || h.changed_by_user_email || (isRTL ? 'غير معروف' : 'Unknown');
          const comment = h.comment ? ` - ${h.comment}` : '';
          return `[${date}] ${oldStatus} → ${newStatus} (${changedBy})${comment}`;
        }).join(' | ');
      };

      // CSV rows with user info and history
      const rows = filteredReports.map(report => [
        report.id,
        report.user_id,
        `"${(report.user_name || '').replace(/"/g, '""')}"`,
        `"${(report.user_phone || '').replace(/"/g, '""')}"`,
        `"${(report.user_email || '').replace(/"/g, '""')}"`,
        `"${report.title.replace(/"/g, '""')}"`,
        `"${report.description.replace(/"/g, '""')}"`,
        getCategoryName(report.category_id),
        getSeverityLabel(report.severity_id),
        getStatusName(report.status_id),
        `"${(report.address_text || '').replace(/"/g, '""')}"`,
        report.latitude,
        report.longitude,
        new Date(report.created_at).toLocaleDateString(),
        `"${formatHistory(historyMap[report.id]).replace(/"/g, '""')}"`,
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Add BOM for proper Arabic encoding
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert(isRTL ? 'فشل في تصدير الملف' : 'Failed to export file');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.reports.title}</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{t.reports.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/report-categories"
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Settings className="w-5 h-5" />
            <span>{isRTL ? 'الفئات' : 'Categories'}</span>
          </Link>
          <button
            onClick={handleOpenTrash}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm sm:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Trash2 className="w-5 h-5" />
            <span>{isRTL ? 'المحذوفات' : 'Trash'}</span>
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredReports.length === 0 || exporting}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {exporting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <Download className="w-5 h-5" />
            )}
            <span>{exporting ? (isRTL ? 'جاري التصدير...' : 'Exporting...') : (isRTL ? 'تصدير CSV' : 'Export CSV')}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.reports.searchPlaceholder}
            className={`w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
          />
        </div>
        
        {/* Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Category Filter */}
          <div className="flex-1 sm:max-w-[200px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white ${isRTL ? 'text-right' : ''}`}
            >
              <option value="ALL">{isRTL ? 'جميع الفئات' : 'All Categories'}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {isRTL ? cat.name_ar || cat.name : cat.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="flex-1 sm:max-w-[200px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white ${isRTL ? 'text-right' : ''}`}
            >
              <option value="ALL">{t.reports.allStatuses}</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.name}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Severity Filter */}
          <div className="flex-1 sm:max-w-[200px]">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white ${isRTL ? 'text-right' : ''}`}
            >
              <option value="ALL">{isRTL ? 'جميع مستويات الخطورة' : 'All Severities'}</option>
              <option value="1">🟢 {isRTL ? 'منخفض' : 'Low'}</option>
              <option value="2">🟡 {isRTL ? 'متوسط' : 'Medium'}</option>
              <option value="3">🔴 {isRTL ? 'عالي' : 'High'}</option>
            </select>
          </div>
          
          {/* Results count */}
          <div className="flex items-center text-sm text-gray-500 sm:ms-auto">
            {isRTL 
              ? `${filteredReports.length} من ${reports.length} تقرير`
              : `${filteredReports.length} of ${reports.length} reports`
            }
          </div>
        </div>
        
        {/* Date and Time Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date From */}
          <div className="flex-1 sm:max-w-[180px]">
            <label className={`block text-xs text-gray-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'من تاريخ' : 'From Date'}
            </label>
            <div className="relative">
              <Calendar className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
              />
            </div>
          </div>
          
          {/* Date To */}
          <div className="flex-1 sm:max-w-[180px]">
            <label className={`block text-xs text-gray-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'إلى تاريخ' : 'To Date'}
            </label>
            <div className="relative">
              <Calendar className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
              />
            </div>
          </div>
          
          {/* Time From */}
          <div className="flex-1 sm:max-w-[140px]">
            <label className={`block text-xs text-gray-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'من وقت' : 'From Time'}
            </label>
            <input
              type="time"
              value={timeFrom}
              onChange={(e) => setTimeFrom(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'text-right' : ''}`}
            />
          </div>
          
          {/* Time To */}
          <div className="flex-1 sm:max-w-[140px]">
            <label className={`block text-xs text-gray-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'إلى وقت' : 'To Time'}
            </label>
            <input
              type="time"
              value={timeTo}
              onChange={(e) => setTimeTo(e.target.value)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'text-right' : ''}`}
            />
          </div>
          
          {/* Clear Filters Button */}
          {(dateFrom || dateTo || timeFrom || timeTo) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setTimeFrom('');
                  setTimeTo('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              >
                {isRTL ? 'مسح' : 'Clear'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-blue-800">
            {isRTL ? `${selectedIds.size} تقرير محدد` : `${selectedIds.size} selected`}
          </span>
          <button
            onClick={() => {
              setBulkStatus('');
              setShowBulkStatusModal(true);
            }}
            disabled={bulkLoading}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-blue-800 transition disabled:opacity-50"
          >
            {isRTL ? 'تحديث الحالة' : 'Update Status'}
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {isRTL ? 'حذف المحدد' : 'Delete Selected'}
          </button>
          <button
            onClick={() => {
              setBulkRepairCostValue('');
              setShowBulkRepairCostModal(true);
            }}
            disabled={bulkLoading}
            className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-1"
          >
            <DollarSign className="w-3.5 h-3.5" />
            {isRTL ? 'تكلفة الإصلاح' : 'Repair Cost'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition"
          >
            {isRTL ? 'إلغاء التحديد' : 'Clear Selection'}
          </button>
        </div>
      )}

      {/* Select All Toggle */}
      <div className="mb-3 flex items-center gap-2">
        <button onClick={toggleSelectAll} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
          {selectedIds.size === filteredReports.length && filteredReports.length > 0 ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          {isRTL ? 'تحديد الكل' : 'Select All'}
        </button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => {
          const category = categories.find(c => c.id === report.category_id);
          return (
          <div
            key={report.id}
            className={`bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition ${selectedIds.has(report.id) ? 'ring-2 ring-primary' : ''}`}
          >
            {/* Selection Checkbox */}
            <div className={`flex items-center mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => toggleSelect(report.id)} className="mr-2">
                {selectedIds.has(report.id) ? (
                  <CheckSquare className="w-5 h-5 text-primary" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <span className="text-xs text-gray-400">#{report.id}</span>
            </div>
            <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className={`font-semibold text-gray-900 text-lg ${isRTL ? 'text-right' : ''}`}>{report.title}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(getStatusName(report.status_id))}`}>
                {getStatusName(report.status_id)}
              </span>
            </div>
            
            {/* Category Badge */}
            {category && (
              <div className={`mb-3 flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {isRTL ? category.name_ar || category.name : category.name}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.severity_id)}`}>
                  {getSeverityIcon(report.severity_id)} {getSeverityLabel(report.severity_id)}
                </span>
              </div>
            )}
            
            <p className={`text-gray-600 text-sm mb-4 line-clamp-2 ${isRTL ? 'text-right' : ''}`}>{report.description}</p>
            
            {/* Report Photo - Prefer AI annotated image if available */}
            {getPhotoUrl(report.photo_urls, report.ai_annotated_url) && (
              <div className="mb-4 relative">
                <a 
                  href={getPhotoUrl(report.photo_urls, report.ai_annotated_url) || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img 
                    src={getPhotoUrl(report.photo_urls, report.ai_annotated_url) || ''} 
                    alt={report.title}
                    className="w-full h-40 object-cover rounded-lg hover:opacity-90 transition cursor-pointer"
                    onError={(e) => {
                      // Hide image if it fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  {report.ai_annotated_url && (
                    <span className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-lg font-medium">
                      🤖 AI
                    </span>
                  )}
                </a>
              </div>
            )}
            
            {/* Reporter Info */}
            {(report.user_name || report.user_phone) && (
              <div className={`flex items-center text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className={`font-medium ${isRTL ? 'ml-2' : 'mr-2'}`}>👤</span>
                <div className={`flex flex-col ${isRTL ? 'text-right' : ''}`}>
                  {report.user_name && (
                    <span className="font-medium text-gray-800">{report.user_name}</span>
                  )}
                  {report.user_phone && (
                    <a href={`tel:${report.user_phone}`} className="text-blue-600 hover:underline text-xs">
                      📞 {report.user_phone}
                    </a>
                  )}
                </div>
              </div>
            )}
            
            <div className={`flex items-center text-sm text-gray-500 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <MapPin className={`w-4 h-4 flex-shrink-0 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {report.address_text ? (
                <span>{report.address_text}</span>
              ) : (
                <span>Lat: {report.latitude}, Lng: {report.longitude}</span>
              )}
            </div>
            
            <a
              href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs text-blue-600 hover:text-blue-800 hover:underline mb-4 block ${isRTL ? 'text-right' : ''}`}
            >
              📍 {t.reports.viewOnMap}
            </a>
            
            <div className={`text-xs text-gray-400 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {new Date(report.created_at).toLocaleDateString()}
            </div>
            
            <div className={`flex flex-col xs:flex-row gap-2 ${isRTL ? 'xs:flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setSelectedReport(report);
                  setNewStatus(getStatusName(report.status_id));
                  setShowStatusModal(true);
                }}
                className="flex-1 px-3 py-2 bg-primary text-white text-xs sm:text-sm rounded-lg hover:bg-blue-800 transition"
              >
                {t.common.status}
              </button>
              <button
                onClick={() => handleEdit(report)}
                className="flex-1 px-3 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition"
              >
                {t.common.edit}
              </button>
              <button
                onClick={() => {
                  setSelectedReport(report);
                  setShowDeleteModal(true);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700 transition"
              >
                {t.common.delete}
              </button>
              <button
                onClick={() => handleShowHistory(report)}
                className={`flex-1 px-3 py-2 bg-purple-600 text-white text-xs sm:text-sm rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <History className="w-4 h-4" />
                {isRTL ? 'السجل' : 'History'}
              </button>
            </div>
            
            {/* WhatsApp Share Button */}
            {/* Repair Cost Section */}
            <div className={`mt-3 p-2.5 bg-orange-50 border border-orange-200 rounded-lg ${isRTL ? 'text-right' : ''}`}>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-800">
                    {isRTL ? 'تكلفة الإصلاح' : 'Repair Cost'}
                  </span>
                </div>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-bold text-orange-700">
                    ${Number(report.repair_cost || 0).toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      setRepairCostReport(report);
                      setRepairCostValue(String(Number(report.repair_cost || 0)));
                      setShowRepairCostModal(true);
                    }}
                    className="px-2 py-0.5 bg-orange-200 text-orange-800 rounded text-xs hover:bg-orange-300 transition"
                  >
                    ✏️
                  </button>
                </div>
              </div>
              {Number(report.total_donated || 0) > 0 && (
                <div className="mt-1.5">
                  <div className={`flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-green-700">{isRTL ? 'تبرعات' : 'Donated'}: ${Number(report.total_donated || 0).toFixed(2)}</span>
                    {Number(report.repair_cost || 0) > 0 && (
                      <span className="text-gray-500">
                        {Math.min(100, Math.round((Number(report.total_donated || 0) / Number(report.repair_cost || 1)) * 100))}%
                      </span>
                    )}
                  </div>
                  {Number(report.repair_cost || 0) > 0 && (
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (Number(report.total_donated || 0) / Number(report.repair_cost || 1)) * 100)}%`,
                          backgroundColor: Number(report.total_donated || 0) >= Number(report.repair_cost || 0) ? '#16a34a' : '#f97316',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WhatsApp Share Button */}
            <button
              onClick={() => {
                const categoryName = getCategoryName(report.category_id);
                const statusName = getStatusName(report.status_id);
                const mapUrl = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
                
                const message = isRTL 
                  ? `📋 *تقرير جديد*\n\n` +
                    `📌 *العنوان:* ${report.title}\n` +
                    `📝 *الوصف:* ${report.description}\n` +
                    `🏷️ *الفئة:* ${categoryName}\n` +
                    `⚠️ *الخطورة:* ${getSeverityIcon(report.severity_id)} ${getSeverityLabel(report.severity_id)}\n` +
                    `📊 *الحالة:* ${statusName}\n` +
                    `📍 *الموقع:* ${report.address_text || 'غير محدد'}\n` +
                    `📅 *التاريخ:* ${new Date(report.created_at).toLocaleDateString('ar')}\n\n` +
                    `🗺️ *رابط الخريطة:* ${mapUrl}`
                  : `📋 *New Report*\n\n` +
                    `📌 *Title:* ${report.title}\n` +
                    `📝 *Description:* ${report.description}\n` +
                    `🏷️ *Category:* ${categoryName}\n` +
                    `⚠️ *Severity:* ${getSeverityIcon(report.severity_id)} ${getSeverityLabel(report.severity_id)}\n` +
                    `📊 *Status:* ${statusName}\n` +
                    `📍 *Location:* ${report.address_text || 'Not specified'}\n` +
                    `📅 *Date:* ${new Date(report.created_at).toLocaleDateString()}\n\n` +
                    `🗺️ *Map Link:* ${mapUrl}`;
                
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
              }}
              className={`mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#25D366] text-white text-xs sm:text-sm rounded-lg hover:bg-[#128C7E] transition ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Share2 className="w-4 h-4" />
              {isRTL ? 'مشاركة عبر واتساب' : 'Share on WhatsApp'}
            </button>
          </div>
        );
        })}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{t.reports.noReportsFound}</p>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t.reports.updateReportStatus}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.common.status}
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.name}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.reports.commentOptional}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  rows={3}
                  placeholder={t.reports.addComment}
                />
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setComment('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleUpdateStatus}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800"
              >
                {t.reports.update}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {showEditModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>{t.reports.editReport}</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.reports.reportTitle}
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.reports.reportDescription}
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  rows={4}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.common.status}
                </label>
                <select
                  value={editForm.status_id}
                  onChange={(e) => setEditForm({ ...editForm, status_id: parseInt(e.target.value) })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800"
              >
                {t.users.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-red-600 mb-4 ${isRTL ? 'text-right' : ''}`}>{t.reports.deleteReport}</h2>
            <p className={`text-gray-700 mb-6 ${isRTL ? 'text-right' : ''}`}>
              {t.reports.deleteConfirmText}: <strong>{selectedReport.title}</strong>?
            </p>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedReport(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className={`text-xl font-bold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <History className="w-6 h-6 text-purple-600" />
                {isRTL ? 'سجل التغييرات' : 'Change History'}
              </h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setReportHistory([]);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? `التقرير: ${selectedReport.title}` : `Report: ${selectedReport.title}`}
            </p>
            
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                </div>
              ) : reportHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {isRTL ? 'لا يوجد سجل تغييرات' : 'No change history'}
                </div>
              ) : (
                <div className="space-y-4">
                  {reportHistory.map((entry, index) => (
                    <div 
                      key={entry.id} 
                      className={`border-l-4 ${index === 0 ? 'border-purple-600' : 'border-gray-300'} pl-4 py-2`}
                      style={{ borderLeftWidth: isRTL ? '0' : '4px', borderRightWidth: isRTL ? '4px' : '0', paddingLeft: isRTL ? '0' : '1rem', paddingRight: isRTL ? '1rem' : '0' }}
                    >
                      <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        {entry.old_status_id && (
                          <>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(getStatusName(entry.old_status_id))}`}>
                              {getStatusName(entry.old_status_id)}
                            </span>
                            <span className="text-gray-400">→</span>
                          </>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(getStatusName(entry.new_status_id))}`}>
                          {getStatusName(entry.new_status_id)}
                        </span>
                      </div>
                      
                      {entry.comment && (
                        <p className={`text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2 ${isRTL ? 'text-right' : ''}`}>
                          💬 {entry.comment}
                        </p>
                      )}
                      
                      <div className={`flex items-center gap-2 mt-2 text-xs text-gray-500 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        {entry.changed_by_user_name && (
                          <span className="flex items-center gap-1">
                            👤 {entry.changed_by_user_name}
                            {entry.changed_by_user_email && (
                              <span className="text-gray-400">({entry.changed_by_user_email})</span>
                            )}
                          </span>
                        )}
                        <span>•</span>
                        <span>{new Date(entry.created_at).toLocaleString(isRTL ? 'ar' : 'en')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setReportHistory([]);
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Modal */}
      {showTrash && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className={`text-xl font-bold text-gray-900 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Trash2 className="w-6 h-6 text-gray-600" />
                {isRTL ? 'التقارير المحذوفة' : 'Deleted Reports'}
              </h2>
              <button
                onClick={() => setShowTrash(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL 
                ? 'يمكنك استعادة التقارير المحذوفة من هنا' 
                : 'You can restore deleted reports from here'}
            </p>
            
            <div className="flex-1 overflow-y-auto">
              {trashLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-600"></div>
                </div>
              ) : deletedReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  {isRTL ? 'لا توجد تقارير محذوفة' : 'No deleted reports'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deletedReports.map((report) => {
                    const category = categories.find(c => c.id === report.category_id);
                    return (
                      <div
                        key={report.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className={`flex items-start justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h3 className={`font-semibold text-gray-900 ${isRTL ? 'text-right' : ''}`}>{report.title}</h3>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            {isRTL ? 'محذوف' : 'Deleted'}
                          </span>
                        </div>
                        
                        {category && (
                          <div className={`mb-2 ${isRTL ? 'text-right' : ''}`}>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                              {isRTL ? category.name_ar || category.name : category.name}
                            </span>
                          </div>
                        )}
                        
                        {/* Reporter Info in Trash */}
                        {(report.user_name || report.user_phone) && (
                          <div className={`text-xs text-gray-500 mb-2 ${isRTL ? 'text-right' : ''}`}>
                            👤 {report.user_name} {report.user_phone && `• ${report.user_phone}`}
                          </div>
                        )}
                        
                        <p className={`text-gray-600 text-sm mb-3 line-clamp-2 ${isRTL ? 'text-right' : ''}`}>
                          {report.description}
                        </p>
                        
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="text-xs text-gray-400">
                            {new Date(report.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}
                          </span>
                          <button
                            onClick={() => handleRestore(report)}
                            className={`flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <RotateCcw className="w-4 h-4" />
                            {isRTL ? 'استعادة' : 'Restore'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => setShowTrash(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repair Cost Edit Modal */}
      {showRepairCostModal && repairCostReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-lg font-bold text-gray-900 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'تعديل تكلفة الإصلاح' : 'Edit Repair Cost'}
            </h2>
            <p className={`text-sm text-gray-500 mb-4 ${isRTL ? 'text-right' : ''}`}>
              #{repairCostReport.id} - {repairCostReport.title}
            </p>
            <div className="mb-4">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {isRTL ? 'التكلفة (بالدولار)' : 'Cost (USD)'}
              </label>
              <div className="relative">
                <DollarSign className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                  type="number"
                  value={repairCostValue}
                  onChange={(e) => setRepairCostValue(e.target.value)}
                  min="0"
                  step="0.01"
                  className={`w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {Number(repairCostReport.total_donated || 0) > 0 && (
                <p className={`text-xs text-green-600 mt-2 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'إجمالي التبرعات الحالية' : 'Current total donated'}: ${Number(repairCostReport.total_donated || 0).toFixed(2)}
                </p>
              )}
            </div>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setShowRepairCostModal(false); setRepairCostReport(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleRepairCostSave}
                disabled={repairCostSaving}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {repairCostSaving ? '...' : (isRTL ? 'حفظ' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Repair Cost Modal */}
      {showBulkRepairCostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-lg font-bold text-gray-900 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'تكلفة إصلاح جماعية' : 'Bulk Repair Cost'}
            </h2>
            <p className={`text-sm text-gray-500 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? `تحديث تكلفة الإصلاح لـ ${selectedIds.size} تقرير` : `Update repair cost for ${selectedIds.size} reports`}
            </p>
            <div className="mb-4">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {isRTL ? 'التكلفة (بالدولار)' : 'Cost (USD)'}
              </label>
              <div className="relative">
                <DollarSign className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                  type="number"
                  value={bulkRepairCostValue}
                  onChange={(e) => setBulkRepairCostValue(e.target.value)}
                  min="0"
                  step="0.01"
                  className={`w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setShowBulkRepairCostModal(false); setBulkRepairCostValue(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleBulkRepairCostUpdate}
                disabled={!bulkRepairCostValue || bulkRepairCostLoading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {bulkRepairCostLoading ? '...' : (isRTL ? 'تحديث الكل' : 'Update All')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Status Update Modal */}
      {showBulkStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? `تحديث حالة ${selectedIds.size} تقرير` : `Update Status of ${selectedIds.size} Reports`}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'الحالة الجديدة' : 'New Status'}
                </label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                >
                  <option value="">{isRTL ? 'اختر الحالة' : 'Select Status'}</option>
                  {statuses.map((s: any) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'تعليق (اختياري)' : 'Comment (optional)'}
                </label>
                <textarea
                  value={bulkComment}
                  onChange={(e) => setBulkComment(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  rows={3}
                />
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setShowBulkStatusModal(false); setBulkComment(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleBulkStatusUpdate}
                disabled={!bulkStatus || bulkLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
              >
                {bulkLoading ? (isRTL ? 'جاري التحديث...' : 'Updating...') : (isRTL ? 'تحديث' : 'Update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
