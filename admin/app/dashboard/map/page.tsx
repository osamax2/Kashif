'use client';

import { reportsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Report } from '@/lib/types';
import { FileText, MapPin, Search, Tag, X } from 'lucide-react';
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
  const { t, isRTL } = useLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([24.7136, 46.6753]); // Riyadh default
  const [mapZoom, setMapZoom] = useState(10);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [textFilter, setTextFilter] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadData();
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
        const reporterName = (report.reporter_name || '').toLowerCase();
        const reporterPhone = (report.reporter_phone || '').toLowerCase();
        
        return title.includes(query) || 
               description.includes(query) || 
               address.includes(query) ||
               reporterName.includes(query) ||
               reporterPhone.includes(query) ||
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
          subtitle: `${reportsInCategory} ${isRTL ? 'تقرير' : 'reports'}`
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
            subtitle: isRTL ? 'موقع على الخريطة' : 'Location on map'
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
      setMapCenter([parseFloat(result.location.lat), parseFloat(result.location.lon)]);
      setMapZoom(15);
    } else if (result.type === 'category' && result.category) {
      setCategoryFilter(result.category.id.toString());
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

  const filteredReports = reports.filter(report => {
    if (categoryFilter !== 'ALL' && report.category_id !== parseInt(categoryFilter)) return false;
    if (statusFilter !== 'ALL') {
      const status = statuses.find(s => s.name === statusFilter);
      if (status && report.status_id !== status.id) return false;
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
          {isRTL ? 'خريطة التقارير' : 'Reports Map'}
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          {isRTL ? 'عرض جميع التقارير على الخريطة' : 'View all reports on the map'}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 space-y-3">
        {/* Smart Search Bar */}
        <div className="relative">
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 relative">
              <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'ابحث عن تقرير، فئة، موقع، اسم المبلغ...' : 'Search reports, categories, locations, reporter name...'}
                className={`w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10'}`}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setTextFilter('');
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
                  {isRTL ? 'التقارير' : 'Reports'}
                </div>
              )}
              {searchResults.filter(r => r.type === 'report').map((result, index) => (
                <button
                  key={`report-${index}`}
                  onClick={() => handleSelectResult(result)}
                  className={`w-full px-4 py-2.5 text-sm hover:bg-green-50 border-b border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                  {isRTL ? 'الفئات' : 'Categories'}
                </div>
              )}
              {searchResults.filter(r => r.type === 'category').map((result, index) => (
                <button
                  key={`category-${index}`}
                  onClick={() => handleSelectResult(result)}
                  className={`w-full px-4 py-2.5 text-sm hover:bg-purple-50 border-b border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                  {isRTL ? 'المواقع' : 'Locations'}
                </div>
              )}
              {searchResults.filter(r => r.type === 'location').map((result, index) => (
                <button
                  key={`location-${index}`}
                  onClick={() => handleSelectResult(result)}
                  className={`w-full px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                  {isRTL ? 'جاري البحث...' : 'Searching...'}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Filters */}
        <div className={`flex flex-wrap gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'text-right' : ''}`}
          >
            <option value="ALL">{isRTL ? 'جميع الفئات' : 'All Categories'}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {isRTL ? cat.name_ar || cat.name : cat.name}
              </option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white text-sm ${isRTL ? 'text-right' : ''}`}
          >
            <option value="ALL">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.name}>
                {status.name}
              </option>
            ))}
          </select>
          
          <div className={`flex items-center text-sm text-gray-500 ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
            <MapPin className="w-4 h-4 mr-1" />
            {isRTL 
              ? `${filteredReports.length} تقرير على الخريطة`
              : `${filteredReports.length} reports on map`
            }
          </div>
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
                >
                  <Popup>
                    <div className="min-w-[200px]" dir={isRTL ? 'rtl' : 'ltr'}>
                      <h3 className="font-bold text-gray-900 mb-1">{report.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <span 
                          className="px-2 py-0.5 rounded text-xs text-white"
                          style={{ backgroundColor: getStatusColor(getStatusName(report.status_id)) }}
                        >
                          {getStatusName(report.status_id)}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                          {getCategoryName(report.category_id)}
                        </span>
                      </div>
                      {report.address_text && (
                        <p className="text-xs text-gray-500 mb-2">📍 {report.address_text}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(report.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-2 block"
                      >
                        {isRTL ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Legend */}
      <div className={`mt-3 flex flex-wrap gap-4 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
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
    </div>
  );
}
