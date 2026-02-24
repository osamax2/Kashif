'use client';

import { reportsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Report, ReportStatusHistory } from '@/lib/types';
import { Calendar, ChevronDown, Download, FileText, History, MapPin, Search, Share2, Tag, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamic import for Leaflet (client-side only)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

interface SearchResult {
  type: 'report' | 'location' | 'category';
  report?: Report;
  location?: any;
  category?: any;
  displayName: string;
  subtitle?: string;
}

export default function MapPage() {
  const {t, isRTL, language} = useLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.9306, 36.6339]); // Idleb default
  const [mapZoom, setMapZoom] = useState(10);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [textFilter, setTextFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [isClient, setIsClient] = useState(false);

  // Area search filter
  const [areaFilter, setAreaFilter] = useState<{ lat: number; lng: number; radius: number; name: string } | null>(null);
  const [areaRadius, setAreaRadius] = useState(2); // km

  // Report Card Modal states
  const [showReportCard, setShowReportCard] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [reportHistory, setReportHistory] = useState<ReportStatusHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status_id: 1,
  });

  useEffect(() => {
    setIsClient(true);
    loadData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.category-dropdown') && !target.closest('.status-dropdown')) {
        setShowCategoryDropdown(false);
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsData, categoriesData, statusesData] = await Promise.all([
        reportsAPI.getReports({ limit: 1000 }),
        reportsAPI.getCategories(),
        reportsAPI.getStatuses(),
      ]);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setStatuses(Array.isArray(statusesData) ? statusesData : []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Haversine distance in km
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'Unknown';
    return isRTL ? (category.name_ar || category.name) : category.name;
  };

  const getStatusName = (statusId: number) => {
    const status = statuses.find(s => s.id === statusId);
    return status ? status.name : 'UNKNOWN';
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    try {
      // 1. Search in Reports (title, description, address, user info)
      const matchingReports = reports.filter(report => {
        const title = (report.title || '').toLowerCase();
        const description = (report.description || '').toLowerCase();
        const address = (report.address_text || '').toLowerCase();
        const userName = (report.user_name || '').toLowerCase();
        const userPhone = (report.user_phone || '').toLowerCase();
        const userEmail = (report.user_email || '').toLowerCase();

        return title.includes(query) ||
            description.includes(query) ||
            address.includes(query) ||
            userName.includes(query) ||
            userPhone.includes(query) ||
            userEmail.includes(query) ||
            report.id.toString() === query;
      });

      // Add matching reports to results (max 5)
      matchingReports.slice(0, 5).forEach(report => {
        results.push({
          type: 'report',
          report,
          displayName: report.title || `Report #${report.id}`,
          subtitle: `${getCategoryName(report.category_id)} • ${report.address_text || ''}`
        });
      });

      // 2. Search in Categories
      const matchingCategories = categories.filter(cat => {
        const name = (cat.name || '').toLowerCase();
        const nameAr = (cat.name_ar || '').toLowerCase();
        return name.includes(query) || nameAr.includes(query);
      });

      // Add matching categories to results
      matchingCategories.slice(0, 3).forEach(cat => {
        const reportsInCategory = reports.filter(r => r.category_id === cat.id).length;
        results.push({
          type: 'category',
          category: cat,
          displayName: isRTL ? (cat.name_ar || cat.name) : cat.name,
          subtitle: `${reportsInCategory} ${language === 'ar' ? 'تقرير' : language === 'ku' ? 'Rapor' : 'reports'}`
        });
      });

      // 3. Search for Location using Nominatim (only if query is 3+ chars)
      if (query.length >= 3) {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=3`
        );
        const locationData = await response.json();

        locationData.forEach((loc: any) => {
          results.push({
            type: 'location',
            location: loc,
            displayName: loc.display_name.split(',').slice(0, 3).join(','),
            subtitle: language === 'ar' ? 'موقع على الخريطة' : language === 'ku' ? 'Cih li ser nexşe' : 'Location on map'
          });
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'report' && result.report) {
      const lat = parseFloat(result.report.latitude);
      const lng = parseFloat(result.report.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter([lat, lng]);
        setMapZoom(17);
        setSelectedReport(result.report);
      }
    } else if (result.type === 'location' && result.location) {
      const lat = parseFloat(result.location.lat);
      const lon = parseFloat(result.location.lon);
      setMapCenter([lat, lon]);
      setMapZoom(15);
      setAreaFilter({ lat, lng: lon, radius: areaRadius, name: result.displayName });
    } else if (result.type === 'category' && result.category) {
      setCategoryFilter([result.category.id.toString()]);
      // Find center of all reports in this category
      const categoryReports = reports.filter(r => r.category_id === result.category.id);
      if (categoryReports.length > 0) {
        const firstReport = categoryReports[0];
        const lat = parseFloat(firstReport.latitude);
        const lng = parseFloat(firstReport.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapCenter([lat, lng]);
          setMapZoom(12);
        }
      }
    }
    setSearchResults([]);
    setSearchQuery(result.displayName);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'report': return <FileText className="w-4 h-4 text-green-500" />;
      case 'category': return <Tag className="w-4 h-4 text-purple-500" />;
      case 'location': return <MapPin className="w-4 h-4 text-blue-500" />;
      default: return <Search className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (statusName: string) => {
    switch (statusName) {
      case 'NEW': return '#3B82F6';
      case 'IN_PROGRESS': return '#F59E0B';
      case 'RESOLVED': return '#10B981';
      case 'REJECTED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusBgClass = (statusName: string) => {
    switch (statusName) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Export to CSV
  const [exporting, setExporting] = useState(false);

  const exportToCSV = async () => {
    try {
      setExporting(true);

      // Fetch history for all reports in parallel
      const historyPromises = filteredReports.map(report =>
          reportsAPI.getReportHistory(report.id).catch(() => [])
      );
      const allHistories = await Promise.all(historyPromises);

      // Create a map of report id to history
      const historyMap: { [key: number]: ReportStatusHistory[] } = {};
      filteredReports.forEach((report, index) => {
        historyMap[report.id] = Array.isArray(allHistories[index]) ? allHistories[index] : [];
      });

      // Format history for CSV
      const formatHistory = (history: ReportStatusHistory[]) => {
        if (!history || history.length === 0) return language === 'ar' ? 'لا يوجد سجل' : language === 'ku' ? 'Qeydek tune' : 'No history';
        return history.map(h => {
          const date = new Date(h.created_at).toLocaleDateString();
          const oldStatus = h.old_status_id ? getStatusName(h.old_status_id) : (language === 'ar' ? 'جديد' : language === 'ku' ? 'Nû' : 'New');
          const newStatus = getStatusName(h.new_status_id);
          const changedBy = h.changed_by_user_name || h.changed_by_user_email || (language === 'ar' ? 'غير معروف' : language === 'ku' ? 'Nenas' : 'Unknown');
          const comment = h.comment ? ` - ${h.comment}` : '';
          return `[${date}] ${oldStatus} → ${newStatus} (${changedBy})${comment}`;
        }).join(' | ');
      };

      // CSV headers - includes user info and history
      const headers = [
        'ID',
        language === 'ar' ? 'معرف المستخدم' : language === 'ku' ? 'Bikarhêner ID' : 'User ID',
        language === 'ar' ? 'اسم المبلغ' : language === 'ku' ? 'Navê mîqdarê' : 'Reporter Name',
        language === 'ar' ? 'هاتف المبلغ' : language === 'ku' ? 'Telefonê taybetî' : 'Reporter Phone',
        language === 'ar' ? 'بريد المبلغ' : language === 'ku' ? 'Mîqdara nameyê' : 'Reporter Email',
        language === 'ar' ? 'العنوان' : language === 'ku' ? 'Navnîşan' : 'Title',
        language === 'ar' ? 'الوصف' : language === 'ku' ? 'Danasîn' : 'Description',
        language === 'ar' ? 'الفئة' : language === 'ku' ? 'Kategorî' : 'Category',
        language === 'ar' ? 'الحالة' : language === 'ku' ? 'Rewş' : 'Status',
        language === 'ar' ? 'العنوان' : language === 'ku' ? 'Navnîşan' : 'Address',
        language === 'ar' ? 'خط العرض' : language === 'ku' ? 'Xeta Firehî' : 'Latitude',
        language === 'ar' ? 'خط الطول' : language === 'ku' ? 'Dirêjahiya xetê' : 'Longitude',
        language === 'ar' ? 'تاريخ الإنشاء' : language === 'ku' ? 'Dîroka çêkirinê' : 'Created At',
        language === 'ar' ? 'سجل التغييرات' : language === 'ku' ? 'Tomara Guherînê' : 'Status History',
      ];

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
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const areaSlug = areaFilter ? `_${areaFilter.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_').substring(0, 40)}` : '';
      link.setAttribute('download', `map_reports${areaSlug}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  // Report Card Handlers
  const handleOpenReportCard = (report: Report) => {
    setSelectedReport(report);
    setShowReportCard(true);
  };

  const handleShowHistory = async (report: Report) => {
    setSelectedReport(report);
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const data = await reportsAPI.getReportHistory(report.id);
      setReportHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
      setReportHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport || !newStatus) return;
    try {
      const statusObj = statuses.find((s) => s.name === newStatus);
      await reportsAPI.updateReportStatus(selectedReport.id, { status_id: statusObj.id, admin_comment: comment || undefined });
      // Reload reports
      const data = await reportsAPI.getReports();
      setReports(data);
      // Update selected report
      const updated = data.find((r: Report) => r.id === selectedReport.id);
      if (updated) setSelectedReport(updated);
      setShowStatusModal(false);
      setNewStatus('');
      setComment('');
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleOpenEditModal = (report: Report) => {
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
      const data = await reportsAPI.getReports();
      setReports(data);
      const updated = data.find((r: Report) => r.id === selectedReport.id);
      if (updated) setSelectedReport(updated);
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update report:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedReport) return;
    try {
      await reportsAPI.deleteReport(selectedReport.id);
      const data = await reportsAPI.getReports();
      setReports(data);
      setShowDeleteModal(false);
      setShowReportCard(false);
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const shareOnWhatsApp = (report: Report) => {
    const statusName = getStatusName(report.status_id);
    const categoryName = getCategoryName(report.category_id);
    const lat = parseFloat(report.latitude);
    const lng = parseFloat(report.longitude);
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

    const message = language === 'ar'
        ? `📋 تقرير: ${report.title}\n\n📝 الوصف: ${report.description}\n\n📍 العنوان: ${report.address_text || 'غير محدد'}\n\n📂 الفئة: ${categoryName}\n📊 الحالة: ${statusName}\n\n🗺️ الموقع: ${mapsLink}`
        : language === 'ku'
            ? `📋 Rapor: ${report.title}\n\n📝 Babet:  ${report.description}\n\n📍 Navnîşan: ${report.address_text || 'Nehatiye diyarkirin'}\n\n📂 Kategorî: ${categoryName}\n📊 Rewş: ${statusName}\n\n🗺️ Cih: ${mapsLink}`
            : `📋 Report: ${report.title}\n\n📝 Description: ${report.description}\n\n📍 Address: ${report.address_text || 'Not specified'}\n\n📂 Category: ${categoryName}\n📊 Status: ${statusName}\n\n🗺️ Location: ${mapsLink}`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const filteredReports = reports.filter(report => {
    // Category filter (multi-select)
    if (categoryFilter.length > 0 && !categoryFilter.includes(report.category_id.toString())) return false;

    // Status filter (multi-select)
    if (statusFilter.length > 0) {
      const reportStatus = statuses.find(s => s.id === report.status_id);
      if (reportStatus && !statusFilter.includes(reportStatus.name)) return false;
    }

    // Date filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const reportDate = new Date(report.created_at);
      if (reportDate < fromDate) return false;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      const reportDate = new Date(report.created_at);
      if (reportDate > toDate) return false;
    }

    // Time filter
    if (timeFrom) {
      const [fromHours, fromMinutes] = timeFrom.split(':').map(Number);
      const reportDate = new Date(report.created_at);
      const reportMinutes = reportDate.getHours() * 60 + reportDate.getMinutes();
      const filterMinutes = fromHours * 60 + fromMinutes;
      if (reportMinutes < filterMinutes) return false;
    }

    if (timeTo) {
      const [toHours, toMinutes] = timeTo.split(':').map(Number);
      const reportDate = new Date(report.created_at);
      const reportMinutes = reportDate.getHours() * 60 + reportDate.getMinutes();
      const filterMinutes = toHours * 60 + toMinutes;
      if (reportMinutes > filterMinutes) return false;
    }

    // Area filter (radius-based)
    if (areaFilter) {
      const rLat = parseFloat(report.latitude);
      const rLng = parseFloat(report.longitude);
      if (isNaN(rLat) || isNaN(rLng)) return false;
      const dist = haversineDistance(areaFilter.lat, areaFilter.lng, rLat, rLng);
      if (dist > areaFilter.radius) return false;
    }

    return true;
  });

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );
  }

  return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="h-[calc(100vh-120px)]">
        <div className={`mb-4 ${isRTL ? 'text-right' : ''}`}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {language === 'ar' ? 'خريطة التقارير' : language === 'ku' ? 'Nexşeya Raporan' : 'Reports Map'}
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            {language === 'ar' ? 'عرض جميع التقارير على الخريطة' : language === 'ku' ? 'Hemû raporan li ser nexşeyê nîşan bidin' : 'View all reports on the map'}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 space-y-3">
          {/* Smart Search Bar */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث عن تقرير، فئة، موقع، اسم المبلغ...' : language === 'ku' ? 'Li rapor, kategorî, cîh, navê deyndêr bigerin...' : 'Search reports, categories, locations, reporter name...'}
                    className={`w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10'}`}
                />
                {searchQuery && (
                    <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          setTextFilter('');
                          setAreaFilter(null);
                        }}
                        className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${isRTL ? 'left-3' : 'right-3'}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                )}
              </div>
            </div>

            {/* Smart Search Results Dropdown */}
            {searchResults.length > 0 && (
                <div className="absolute z-[800] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {/* Group by type */}
                  {searchResults.filter(r => r.type === 'report').length > 0 && (
                      <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 border-b">
                        {language === 'ar' ? 'التقارير' : language === 'ku' ? 'Rapor' : 'Reports'}
                      </div>
                  )}
                  {searchResults.filter(r => r.type === 'report').map((result, index) => (
                      <button
                          key={`report-${index}`}
                          onClick={() => handleSelectResult(result)}
                          className={`w-full px-4 py-2.5 text-sm hover:bg-green-50 border-b border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="flex items-start gap-3">
                          {getResultIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{result.displayName}</p>
                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                          </div>
                        </div>
                      </button>
                  ))}

                  {searchResults.filter(r => r.type === 'category').length > 0 && (
                      <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 border-b">
                        {language === 'ar' ? 'الفئات' : language === 'ku' ? 'Kategorî' : 'Categories'}
                      </div>
                  )}
                  {searchResults.filter(r => r.type === 'category').map((result, index) => (
                      <button
                          key={`category-${index}`}
                          onClick={() => handleSelectResult(result)}
                          className={`w-full px-4 py-2.5 text-sm hover:bg-purple-50 border-b border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="flex items-start gap-3">
                          {getResultIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{result.displayName}</p>
                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                          </div>
                        </div>
                      </button>
                  ))}

                  {searchResults.filter(r => r.type === 'location').length > 0 && (
                      <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 border-b">
                        {language === 'ar' ? 'المواقع' : language === 'ku' ? 'Malperên ' : 'Locations'}
                      </div>
                  )}
                  {searchResults.filter(r => r.type === 'location').map((result, index) => (
                      <button
                          key={`location-${index}`}
                          onClick={() => handleSelectResult(result)}
                          className={`w-full px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <div className="flex items-start gap-3">
                          {getResultIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{result.displayName}</p>
                            <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                          </div>
                        </div>
                      </button>
                  ))}

                  {searching && (
                      <div className="px-4 py-3 text-center text-sm text-gray-500">
                        <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full mr-2"></div>
                        {language === 'ar' ? 'جاري البحث...' : language === 'ku' ? 'Lêgerîn...' : 'Searching...'}
                      </div>
                  )}
                </div>
            )}
          </div>

          {/* Area Filter Badge */}
          {areaFilter && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800 font-medium max-w-[300px] truncate">
                {areaFilter.name}
              </span>
                  <span className="text-xs text-blue-600 bg-blue-100 rounded-full px-2 py-0.5">
                {filteredReports.length} {language === 'ar' ? 'تقرير' : language === 'ku' ? 'Rapor' : 'reports'}
              </span>
                  <span className="text-xs text-blue-500">
                ({areaFilter.radius} km)
              </span>
                  <button
                      onClick={() => setAreaFilter(null)}
                      className="text-blue-400 hover:text-blue-600 ml-1"
                      title={language === 'ar' ? 'إزالة فلتر المنطقة' : language === 'ku' ? 'Fîltreya qadê rakin' : 'Remove area filter'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500">{language === 'ar' ? 'نطاق:' : language === 'ku' ? 'Çap:' : 'Radius:'}</label>
                  <select
                      value={areaRadius}
                      onChange={(e) => {
                        const newRadius = Number(e.target.value);
                        setAreaRadius(newRadius);
                        setAreaFilter(prev => prev ? { ...prev, radius: newRadius } : null);
                      }}
                      className="text-xs border border-gray-300 rounded px-1.5 py-1"
                  >
                    <option value={0.5}>0.5 km</option>
                    <option value={1}>1 km</option>
                    <option value={2}>2 km</option>
                    <option value={3}>3 km</option>
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={20}>20 km</option>
                    <option value={50}>50 km</option>
                  </select>
                </div>
              </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Category Multi-Select Dropdown */}
            <div className="relative category-dropdown">
              <button
                  onClick={() => {
                    setShowCategoryDropdown(!showCategoryDropdown);
                    setShowStatusDropdown(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm min-w-[160px]"
              >
              <span className="flex-1 truncate">
                {categoryFilter.length === 0
                    ? (language === 'ar' ? 'جميع الفئات' : language === 'ku' ? 'Hemû kategoriyan' : 'All Categories')
                    : categoryFilter.length === 1
                        ? (isRTL ? categories.find(c => c.id.toString() === categoryFilter[0])?.name_ar || categories.find(c => c.id.toString() === categoryFilter[0])?.name : categories.find(c => c.id.toString() === categoryFilter[0])?.name)
                        : (language === 'ar' ? `${categoryFilter.length} فئات محددة` : language === 'ku' ? `${categoryFilter.length} Kategoriyên taybetî` : `${categoryFilter.length} selected`)
                }
              </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showCategoryDropdown && (
                  <div className={`absolute z-[900] mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto ${isRTL ? 'right-0' : 'left-0'}`}>
                    {/* Select All / Clear */}
                    <div className="px-3 py-2 border-b border-gray-200 flex justify-between">
                      <button
                          onClick={() => setCategoryFilter(categories.map(c => c.id.toString()))}
                          className="text-xs text-blue-600 hover:underline"
                      >
                        {language === 'ar' ? 'تحديد الكل' : language === 'ku' ? 'Hemûyan hilbijêre' : 'Select All'}
                      </button>
                      <button
                          onClick={() => setCategoryFilter([])}
                          className="text-xs text-gray-500 hover:underline"
                      >
                        {language === 'ar' ? 'مسح' : language === 'ku' ? 'Jêbirin' : 'Clear'}
                      </button>
                    </div>

                    {categories.map((cat) => (
                        <label
                            key={cat.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                              type="checkbox"
                              checked={categoryFilter.includes(cat.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCategoryFilter([...categoryFilter, cat.id.toString()]);
                                } else {
                                  setCategoryFilter(categoryFilter.filter(id => id !== cat.id.toString()));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">
                      {isRTL ? cat.name_ar || cat.name : cat.name}
                    </span>
                        </label>
                    ))}
                  </div>
              )}
            </div>

            {/* Status Multi-Select Dropdown */}
            <div className="relative status-dropdown">
              <button
                  onClick={() => {
                    setShowStatusDropdown(!showStatusDropdown);
                    setShowCategoryDropdown(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm min-w-[160px]"
              >
              <span className="flex-1 truncate">
                {statusFilter.length === 0
                    ? (language === 'ar' ? 'جميع الحالات' : language === 'ku' ? 'Hemû rewş' : 'All Statuses')
                    : statusFilter.length === 1
                        ? statusFilter[0]
                        : (language === 'ar' ? `${statusFilter.length} حالات محددة` : language === 'ku' ? `${statusFilter.length} Rewşên taybetî` : `${statusFilter.length} selected`)
                }
              </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStatusDropdown && (
                  <div className={`absolute z-[900] mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto ${isRTL ? 'right-0' : 'left-0'}`}>
                    {/* Select All / Clear */}
                    <div className="px-3 py-2 border-b border-gray-200 flex justify-between">
                      <button
                          onClick={() => setStatusFilter(statuses.map(s => s.name))}
                          className="text-xs text-blue-600 hover:underline"
                      >
                        {language === 'ar' ? 'تحديد الكل' : language === 'ku' ? 'Hemûyan hilbijêre' : 'Select All'}
                      </button>
                      <button
                          onClick={() => setStatusFilter([])}
                          className="text-xs text-gray-500 hover:underline"
                      >
                        {language === 'ar' ? 'مسح' : language === 'ku' ? 'Jêbirin' : 'Clear'}
                      </button>
                    </div>

                    {statuses.map((status) => (
                        <label
                            key={status.id}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                              type="checkbox"
                              checked={statusFilter.includes(status.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStatusFilter([...statusFilter, status.name]);
                                } else {
                                  setStatusFilter(statusFilter.filter(name => name !== status.name));
                                }
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">{status.name}</span>
                        </label>
                    ))}
                  </div>
              )}
            </div>

            {/* Export Button */}
            <button
                onClick={exportToCSV}
                disabled={exporting || filteredReports.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Download className="w-4 h-4" />
              {exporting
                  ? (language === 'ar' ? 'جاري التصدير...' : language === 'ku' ? 'Te derxistin...' : 'Exporting...')
                  : (language === 'ar' ? 'تصدير CSV' : language === 'ku' ? 'CSV Derxe' : 'Export CSV')
              }
            </button>

            <div className="flex items-center text-sm text-gray-500 ms-auto">
              <MapPin className="w-4 h-4 mr-1" />
              {language === 'ar' ? `${filteredReports.length} تقرير على الخريطة` : language === 'ku' ? `${filteredReports.length} Rapor li ser nexşeyê` : `${filteredReports.length} reports on map`
              }
            </div>
          </div>

          {/* Date and Time Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Date From */}
            <div className="flex flex-col">
              <label className={`text-xs text-gray-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
                {language === 'ar' ? 'من تاريخ' : language === 'ku' ? 'Ji dîrokê ve' : 'From Date'}
              </label>
              <div className="relative">
                <Calendar className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
                />
              </div>
            </div>

            {/* Date To */}
            <div className="flex flex-col">
              <label className={`text-xs text-gray-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
                {language === 'ar' ? 'إلى تاريخ' : language === 'ku' ? 'Heta rojê' : 'To Date'}
              </label>
              <div className="relative">
                <Calendar className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'pr-10 text-right' : 'pl-10'}`}
                />
              </div>
            </div>

            {/* Time From */}
            <div className="flex flex-col">
              <label className={`text-xs text-gray-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
                {language === 'ar' ? 'من وقت' : language === 'ku' ? 'Ji ber ku' : 'From Time'}
              </label>
              <input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'text-right' : ''}`}
              />
            </div>

            {/* Time To */}
            <div className="flex flex-col">
              <label className={`text-xs text-gray-500 mb-1 ${isRTL ? 'text-right' : ''}`}>
                {language === 'ar' ? 'إلى وقت' : language === 'ku' ? 'Heta demekê' : 'To Time'}
              </label>
              <input
                  type="time"
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'text-right' : ''}`}
              />
            </div>

            {/* Clear Filters */}
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
                    {language === 'ar' ? 'مسح' : language === 'ku' ? 'Jêbirin' : 'Clear'}
                  </button>
                </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200" style={{ height: 'calc(100% - 160px)' }}>
          {isClient && (
              <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
              >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredReports.map((report) => {
                  const lat = parseFloat(report.latitude);
                  const lng = parseFloat(report.longitude);
                  if (isNaN(lat) || isNaN(lng)) return null;

                  return (
                      <Marker
                          key={report.id}
                          position={[lat, lng]}
                          eventHandlers={{
                            click: () => handleOpenReportCard(report)
                          }}
                      >
                        <Popup>
                          <div className="min-w-[180px]" dir={isRTL ? 'rtl' : 'ltr'}>
                            <h3 className="font-bold text-gray-900 mb-1">{report.title}</h3>
                            <p className="text-xs text-gray-500 mb-2">{getCategoryName(report.category_id)}</p>
                            <button
                                onClick={() => handleOpenReportCard(report)}
                                className="w-full py-1.5 bg-primary text-white rounded text-xs hover:bg-primary/90"
                            >
                              {language === 'ar' ? 'عرض التفاصيل' : language === 'ku' ? 'Details nîşan bide' : 'View Details'}
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                  );
                })}
              </MapContainer>
          )}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span>NEW</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span>IN_PROGRESS</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>RESOLVED</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span>REJECTED</span>
          </div>
        </div>

        {/* Report Card Slide Panel */}
        {showReportCard && selectedReport && (
            <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
              <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setShowReportCard(false)}
              ></div>
              <div
                  className={`relative bg-white w-full sm:w-[480px] max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl ${isRTL ? 'text-right' : ''}`}
                  dir={isRTL ? 'rtl' : 'ltr'}
              >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                  <h2 className="font-bold text-lg text-gray-900">
                    {language === 'ar' ? 'تفاصيل التقرير' : language === 'ku' ? 'Hûrguliyên Raporê' : 'Report Details'}
                  </h2>
                  <button
                      onClick={() => setShowReportCard(false)}
                      className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xl text-gray-900 flex-1">{selectedReport.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBgClass(getStatusName(selectedReport.status_id))}`}>
                  {getStatusName(selectedReport.status_id)}
                </span>
                  </div>

                  {/* Category */}
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-500" />
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  {getCategoryName(selectedReport.category_id)}
                </span>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-sm">{selectedReport.description}</p>
                  </div>

                  {/* Reporter Info */}
                  {(selectedReport.user_name || selectedReport.user_phone || selectedReport.user_email) && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-medium mb-2">
                          {language === 'ar' ? 'معلومات المبلغ' : language === 'ku' ? 'Agahdariyên hejmarê' : 'Reporter Info'}
                        </p>
                        <div className="space-y-1">
                          {selectedReport.user_name && (
                              <p className="text-sm text-gray-700 font-medium">{selectedReport.user_name}</p>
                          )}
                          {selectedReport.user_phone && (
                              <a href={`tel:${selectedReport.user_phone}`} className="text-sm text-blue-600 hover:underline block">
                                📞 {selectedReport.user_phone}
                              </a>
                          )}
                          {selectedReport.user_email && (
                              <a href={`mailto:${selectedReport.user_email}`} className="text-sm text-blue-600 hover:underline block">
                                ✉️ {selectedReport.user_email}
                              </a>
                          )}
                          <p className="text-xs text-gray-500">
                            {language === 'ar' ? 'معرف المستخدم: ' : language === 'ku' ? 'Bikarhêner ID:' : 'User ID: '}{selectedReport.user_id}
                          </p>
                        </div>
                      </div>
                  )}

                  {/* Address */}
                  {selectedReport.address_text && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-sm text-gray-600">{selectedReport.address_text}</span>
                      </div>
                  )}

                  {/* Google Maps Link */}
                  <a
                      href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                  >
                    <MapPin className="w-4 h-4" />
                    {language === 'ar' ? 'فتح في خرائط جوجل' : language === 'ku' ? 'Di Nexşeyên Google de vekin' : 'Open in Google Maps'}
                  </a>

                  {/* Date */}
                  <p className="text-xs text-gray-400">
                    {language === 'ar' ? 'تاريخ الإنشاء: ' : language === 'ku' ? 'Dîroka çêkirinê:' : 'Created: '}
                    {new Date(selectedReport.created_at).toLocaleDateString(isRTL ? 'ar' : 'en', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                    <button
                        onClick={() => {
                          setNewStatus(getStatusName(selectedReport.status_id));
                          setShowStatusModal(true);
                        }}
                        className="py-2.5 px-3 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                    >
                      📊 {language === 'ar' ? 'الحالة' : language === 'ku' ? 'Rewş' : 'Status'}
                    </button>
                    <button
                        onClick={() => handleOpenEditModal(selectedReport)}
                        className="py-2.5 px-3 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors flex items-center justify-center gap-2"
                    >
                      ✏️ {language === 'ar' ? 'تعديل' : language === 'ku' ? 'Biguherine' : 'Edit'}
                    </button>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="py-2.5 px-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                    >
                      🗑️ {language === 'ar' ? 'حذف' : language === 'ku' ? 'Jebibe' : 'Delete'}
                    </button>
                    <button
                        onClick={() => handleShowHistory(selectedReport)}
                        className="py-2.5 px-3 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <History className="w-4 h-4" />
                      {language === 'ar' ? 'السجل' : language === 'ku' ? 'Tomar' : 'History'}
                    </button>
                  </div>

                  {/* WhatsApp Share */}
                  <button
                      onClick={() => shareOnWhatsApp(selectedReport)}
                      className="w-full py-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    {language === 'ar' ? 'مشاركة عبر واتساب' : language === 'ku' ? 'Bi rêya WhatsApp parve bikin' : 'Share on WhatsApp'}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Status Modal */}
        {showStatusModal && selectedReport && (
            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowStatusModal(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <h3 className="text-lg font-bold mb-4">
                  {language === 'ar' ? 'تحديث حالة التقرير' : language === 'ku' ? 'Rewşa raporê nûve bike' : 'Update Report Status'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'الحالة الجديدة' : language === 'ku' ? 'Rewşa nû' : 'New Status'}
                    </label>
                    <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {statuses.map((status) => (
                          <option key={status.id} value={status.name}>
                            {status.name}
                          </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'ملاحظة (اختياري)' : language === 'ku' ? 'Şîrove (bijarte)' : 'Comment (optional)'}
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder={language === 'ar' ? 'أضف ملاحظة...' : language === 'ku' ? 'Nîşeyek lê zêde bikin...' : 'Add a comment...'}
                    ></textarea>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => setShowStatusModal(false)}
                        className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleUpdateStatus}
                        className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      {language === 'ar' ? 'حفظ' : language === 'ku' ? 'Tomar bike' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedReport && (
            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowEditModal(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <h3 className="text-lg font-bold mb-4">
                  {language === 'ar' ? 'تعديل التقرير' : language === 'ku' ? 'Rapaortê biguherîne' : 'Edit Report'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'العنوان' : language === 'ku' ? 'Navnîşan' : 'Title'}
                    </label>
                    <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'الوصف' : language === 'ku' ? 'Danasîn' : 'Description'}
                    </label>
                    <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={4}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'ar' ? 'الحالة' : language === 'ku' ? 'Rewş' : 'Status'}
                    </label>
                    <select
                        value={editForm.status_id}
                        onChange={(e) => setEditForm({ ...editForm, status_id: parseInt(e.target.value) })}
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {statuses.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.name}
                          </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                        onClick={() => setShowEditModal(false)}
                        className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleUpdate}
                        className="flex-1 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      {language === 'ar' ? 'حفظ' : language === 'ku' ? 'Tomar bike' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedReport && (
            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🗑️</span>
                </div>
                <h3 className="text-lg font-bold mb-2">
                  {language === 'ar' ? 'حذف التقرير؟' : language === 'ku' ? 'Raporê jê bibe?' : 'Delete Report?'}
                </h3>
                <p className="text-gray-600 text-sm mb-6">
                  {language === 'ar' ? 'هل أنت متأكد من حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.'
                      : language === 'ku'
                          ? 'Hûn bawer in ku hûn dixwazin vê raporê jê bibin? Ev çalakî nikare were betalkirin.'
                          : 'Are you sure you want to delete this report? This action cannot be undone.'}
                </p>
                <div className="flex gap-3">
                  <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                  </button>
                  <button
                      onClick={handleDelete}
                      className="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    {language === 'ar' ? 'حذف' : language === 'ku' ? 'Jebibe' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* History Modal */}
        {showHistoryModal && selectedReport && (
            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowHistoryModal(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    {language === 'ar' ? 'سجل التغييرات' : language === 'ku' ? 'Rojnivîska Guhertinê' : 'Status History'}
                  </h3>
                  <button
                      onClick={() => setShowHistoryModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                  {historyLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      </div>
                  ) : reportHistory.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        {language === 'ar' ? 'لا يوجد سجل' : language === 'ku' ? 'Tomar tune' : 'No history found'}
                      </p>
                  ) : (
                      <div className="space-y-3">
                        {reportHistory.map((item, index) => {
                          const oldStatusName = item.old_status_id ? getStatusName(item.old_status_id) : 'N/A';
                          const newStatusName = getStatusName(item.new_status_id);
                          return (
                              <div key={index} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBgClass(oldStatusName)}`}>
                              {oldStatusName}
                            </span>
                                    <span className="text-gray-400">→</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBgClass(newStatusName)}`}>
                              {newStatusName}
                            </span>
                                  </div>
                                </div>
                                {item.comment && (
                                    <p className="text-sm text-gray-600 mb-2">{item.comment}</p>
                                )}
                                <p className="text-xs text-gray-400">
                                  {new Date(item.created_at).toLocaleDateString(isRTL ? 'ar' : 'en', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                  {item.changed_by_user_name && ` • ${item.changed_by_user_name}`}
                                </p>
                              </div>
                          );
                        })}
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
