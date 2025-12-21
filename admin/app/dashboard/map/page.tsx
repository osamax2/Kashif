'use client';

import { reportsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Report } from '@/lib/types';
import { MapPin, Search, X } from 'lucide-react';
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

export default function MapPage() {
  const { t, isRTL } = useLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([24.7136, 46.6753]); // Riyadh default
  const [mapZoom, setMapZoom] = useState(10);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      // Use Nominatim OpenStreetMap search
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectLocation = (result: any) => {
    setMapCenter([parseFloat(result.lat), parseFloat(result.lon)]);
    setMapZoom(15);
    setSearchResults([]);
    setSearchQuery(result.display_name);
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
        {/* Search Bar */}
        <div className="relative">
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 relative">
              <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={isRTL ? 'ابحث عن موقع...' : 'Search for a location...'}
                className={`w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${isRTL ? 'left-3' : 'right-3'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {searching ? '...' : (isRTL ? 'بحث' : 'Search')}
            </button>
          </div>
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectLocation(result)}
                  className={`w-full px-4 py-2 text-sm hover:bg-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{result.display_name}</span>
                  </div>
                </button>
              ))}
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
