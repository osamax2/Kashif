'use client';

import { reportsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Report, ReportStatusHistory } from '@/lib/types';
import { Download, History, MapPin, Search, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ReportsPage() {
  const { t, isRTL } = useLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
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
    
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredReports(filtered);
  }, [search, statusFilter, categoryFilter, reports, statuses]);

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
      alert('Report deleted successfully!');
      setShowDeleteModal(false);
      setSelectedReport(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete report:', error);
      alert('Failed to delete report');
    }
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

  const exportToCSV = () => {
    // CSV headers
    const headers = [
      'ID',
      isRTL ? 'العنوان' : 'Title',
      isRTL ? 'الوصف' : 'Description',
      isRTL ? 'الفئة' : 'Category',
      isRTL ? 'الحالة' : 'Status',
      isRTL ? 'العنوان' : 'Address',
      isRTL ? 'خط العرض' : 'Latitude',
      isRTL ? 'خط الطول' : 'Longitude',
      isRTL ? 'تاريخ الإنشاء' : 'Created At',
    ];

    // CSV rows
    const rows = filteredReports.map(report => [
      report.id,
      `"${report.title.replace(/"/g, '""')}"`,
      `"${report.description.replace(/"/g, '""')}"`,
      getCategoryName(report.category_id),
      getStatusName(report.status_id),
      `"${(report.address_text || '').replace(/"/g, '""')}"`,
      report.latitude,
      report.longitude,
      new Date(report.created_at).toLocaleDateString(),
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
      <div className={`mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.reports.title}</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{t.reports.subtitle}</p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredReports.length === 0}
          className={`flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Download className="w-5 h-5" />
          <span>{isRTL ? 'تصدير CSV' : 'Export CSV'}</span>
        </button>
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
        <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
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
          
          {/* Results count */}
          <div className={`flex items-center text-sm text-gray-500 ${isRTL ? 'sm:mr-auto' : 'sm:ml-auto'}`}>
            {isRTL 
              ? `${filteredReports.length} من ${reports.length} تقرير`
              : `${filteredReports.length} of ${reports.length} reports`
            }
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => {
          const category = categories.find(c => c.id === report.category_id);
          return (
          <div
            key={report.id}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
          >
            <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className={`font-semibold text-gray-900 text-lg ${isRTL ? 'text-right' : ''}`}>{report.title}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(getStatusName(report.status_id))}`}>
                {getStatusName(report.status_id)}
              </span>
            </div>
            
            {/* Category Badge */}
            {category && (
              <div className={`mb-3 ${isRTL ? 'text-right' : ''}`}>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {isRTL ? category.name_ar || category.name : category.name}
                </span>
              </div>
            )}
            
            <p className={`text-gray-600 text-sm mb-4 line-clamp-2 ${isRTL ? 'text-right' : ''}`}>{report.description}</p>
            
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
                    `📊 *الحالة:* ${statusName}\n` +
                    `📍 *الموقع:* ${report.address_text || 'غير محدد'}\n` +
                    `📅 *التاريخ:* ${new Date(report.created_at).toLocaleDateString('ar')}\n\n` +
                    `🗺️ *رابط الخريطة:* ${mapUrl}`
                  : `📋 *New Report*\n\n` +
                    `📌 *Title:* ${report.title}\n` +
                    `📝 *Description:* ${report.description}\n` +
                    `🏷️ *Category:* ${categoryName}\n` +
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
                      
                      <p className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-right' : ''}`}>
                        {new Date(entry.created_at).toLocaleString(isRTL ? 'ar' : 'en')}
                      </p>
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
    </div>
  );
}
