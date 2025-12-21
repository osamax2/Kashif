'use client';

import { analyticsAPI, couponsAPI, reportsAPI, usersAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { LeaderboardEntry, Report } from '@/lib/types';
import { BarChart3, Building2, Calendar, FileText, Filter, MapPin, TrendingUp, Trophy, Users } from 'lucide-react';
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
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface CompanyRedemptionStats {
  company_id: number;
  company_name: string;
  logo_url: string | null;
  redemption_count: number;
}

interface CategoryStats {
  id: number;
  name: string;
  name_ar: string;
  count: number;
}

interface StatusStats {
  id: number;
  name: string;
  name_ar: string;
  count: number;
  color: string;
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all';

export default function AnalyticsPage() {
  const { t, isRTL } = useLanguage();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyRedemptionStats[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [isClient, setIsClient] = useState(false);
  const [stats, setStats] = useState({
    totalReports: 0,
    resolvedReports: 0,
    pendingReports: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalCompanies: 0,
    activeCompanies: 0,
    totalRedemptions: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [statusStats, setStatusStats] = useState<StatusStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    loadData();
  }, []);

  useEffect(() => {
    filterDataByTime();
  }, [timeFilter, reports, users, categories, statuses]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leaderboardData, reportsData, couponsData, usersData, companiesData, companyRedemptions, categoriesData, statusesData] = await Promise.all([
        analyticsAPI.getLeaderboard(100),
        reportsAPI.getReports({ limit: 10000 }),
        couponsAPI.getRedemptions().catch(() => []),
        usersAPI.getUsers(0, 10000).catch(() => []),
        couponsAPI.getCompanies().catch(() => []),
        couponsAPI.getRedemptionsByCompany().catch(() => []),
        reportsAPI.getCategories().catch(() => []),
        reportsAPI.getStatuses().catch(() => []),
      ]);

      setCompanyStats(Array.isArray(companyRedemptions) ? companyRedemptions : []);
      setReports(Array.isArray(reportsData) ? reportsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setStatuses(Array.isArray(statusesData) ? statusesData : []);

      // Enrich leaderboard with user names
      const usersArray = Array.isArray(usersData) ? usersData : [];
      const enrichedLeaderboard = (Array.isArray(leaderboardData) ? leaderboardData : []).map((entry: any) => {
        const user = usersArray.find((u: any) => u.id === entry.user_id);
        return {
          ...entry,
          full_name: user?.full_name || `User ${entry.user_id}`,
        };
      });
      setLeaderboard(enrichedLeaderboard);

      // Calculate stats
      const reportsArray = Array.isArray(reportsData) ? reportsData : [];
      const usersArr = Array.isArray(usersData) ? usersData : [];
      const companiesArr = Array.isArray(companiesData) ? companiesData : [];

      setStats({
        totalReports: reportsArray.length,
        resolvedReports: reportsArray.filter((r: any) => r.status_id === 3).length,
        pendingReports: reportsArray.filter((r: any) => r.status_id === 1).length,
        totalUsers: usersArr.length,
        activeUsers: usersArr.filter((u: any) => u.status === 'ACTIVE').length,
        totalCompanies: companiesArr.filter((c: any) => c.status !== 'DELETED').length,
        activeCompanies: companiesArr.filter((c: any) => c.status === 'ACTIVE').length,
        totalRedemptions: Array.isArray(couponsData) ? couponsData.length : 0,
      });

    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDataByTime = () => {
    const now = new Date();
    let startDate: Date;

    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filtered = reports.filter((r) => {
      const reportDate = new Date(r.created_at);
      return reportDate >= startDate;
    });
    setFilteredReports(filtered);

    // Calculate category stats
    const catStats: { [key: number]: CategoryStats } = {};
    categories.forEach((cat) => {
      catStats[cat.id] = { id: cat.id, name: cat.name, name_ar: cat.name_ar || cat.name, count: 0 };
    });
    filtered.forEach((r) => {
      if (catStats[r.category_id]) {
        catStats[r.category_id].count++;
      }
    });
    setCategoryStats(Object.values(catStats).filter((c) => c.count > 0).sort((a, b) => b.count - a.count));

    // Calculate status stats
    const statusColors: { [key: number]: string } = {
      1: 'bg-yellow-500',
      2: 'bg-blue-500',
      3: 'bg-green-500',
      4: 'bg-red-500',
    };
    const statStats: { [key: number]: StatusStats } = {};
    statuses.forEach((s) => {
      statStats[s.id] = { id: s.id, name: s.name, name_ar: s.name_ar || s.name, count: 0, color: statusColors[s.id] || 'bg-gray-500' };
    });
    filtered.forEach((r) => {
      if (statStats[r.status_id]) {
        statStats[r.status_id].count++;
      }
    });
    setStatusStats(Object.values(statStats).filter((s) => s.count > 0));
  };

  const getTimeFilterLabel = (filter: TimeFilter) => {
    const labels = {
      today: isRTL ? 'اليوم' : 'Today',
      week: isRTL ? 'هذا الأسبوع' : 'This Week',
      month: isRTL ? 'هذا الشهر' : 'This Month',
      year: isRTL ? 'هذا العام' : 'This Year',
      all: isRTL ? 'الكل' : 'All Time',
    };
    return labels[filter];
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
      {/* Header with Time Filter */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.analytics.title}</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{isRTL ? 'إحصائيات ورؤى المنصة' : 'Platform statistics and insights'}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
          >
            <option value="today">{getTimeFilterLabel('today')}</option>
            <option value="week">{getTimeFilterLabel('week')}</option>
            <option value="month">{getTimeFilterLabel('month')}</option>
            <option value="year">{getTimeFilterLabel('year')}</option>
            <option value="all">{getTimeFilterLabel('all')}</option>
          </select>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Reports Stats */}
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-blue-500 ${isRTL ? 'text-right border-l-0 border-r-4' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">{isRTL ? 'إجمالي البلاغات' : 'Total Reports'}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{filteredReports.length}</p>
            </div>
          </div>
        </div>

        {/* Users Stats */}
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-green-500 ${isRTL ? 'text-right border-l-0 border-r-4' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">{isRTL ? 'المستخدمين' : 'Users'}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              <p className="text-xs text-green-600">{stats.activeUsers} {isRTL ? 'نشط' : 'active'}</p>
            </div>
          </div>
        </div>

        {/* Companies Stats */}
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-purple-500 ${isRTL ? 'text-right border-l-0 border-r-4' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">{isRTL ? 'الشركات' : 'Companies'}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalCompanies}</p>
              <p className="text-xs text-purple-600">{stats.activeCompanies} {isRTL ? 'نشط' : 'active'}</p>
            </div>
          </div>
        </div>

        {/* Redemptions Stats */}
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-yellow ${isRTL ? 'text-right border-l-0 border-r-4' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-yellow/20 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow" />
            </div>
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">{isRTL ? 'استخدام الكوبونات' : 'Redemptions'}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalRedemptions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports Stats Row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className={`bg-white rounded-xl shadow-sm p-4 ${isRTL ? 'text-right' : ''}`}>
          <p className="text-gray-500 text-xs sm:text-sm mb-1">{isRTL ? 'قيد الانتظار' : 'Pending'}</p>
          <p className="text-lg sm:text-xl font-bold text-yellow-600">{stats.pendingReports}</p>
        </div>
        <div className={`bg-white rounded-xl shadow-sm p-4 ${isRTL ? 'text-right' : ''}`}>
          <p className="text-gray-500 text-xs sm:text-sm mb-1">{isRTL ? 'تم الحل' : 'Resolved'}</p>
          <p className="text-lg sm:text-xl font-bold text-green-600">{stats.resolvedReports}</p>
        </div>
        <div className={`bg-white rounded-xl shadow-sm p-4 ${isRTL ? 'text-right' : ''}`}>
          <p className="text-gray-500 text-xs sm:text-sm mb-1">{isRTL ? 'معدل الحل' : 'Resolution Rate'}</p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">
            {stats.totalReports > 0 ? Math.round((stats.resolvedReports / stats.totalReports) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Reports by Category */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h2 className="text-lg font-bold text-gray-900">{isRTL ? 'البلاغات حسب الفئة' : 'Reports by Category'}</h2>
              <p className="text-xs text-gray-500">{isRTL ? 'توزيع البلاغات على الفئات' : 'Distribution across categories'}</p>
            </div>
          </div>
          
          {categoryStats.length > 0 ? (
            <div className="space-y-3">
              {categoryStats.slice(0, 8).map((cat, index) => {
                const maxCount = categoryStats[0]?.count || 1;
                const percentage = (cat.count / maxCount) * 100;
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'];
                
                return (
                  <div key={cat.id} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="font-medium text-gray-700 text-sm truncate">{isRTL ? cat.name_ar : cat.name}</span>
                        <span className="font-bold text-gray-600 text-sm">{cat.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${colors[index % colors.length]}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data available'}</p>
            </div>
          )}
        </div>

        {/* Reports by Status */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h2 className="text-lg font-bold text-gray-900">{isRTL ? 'البلاغات حسب الحالة' : 'Reports by Status'}</h2>
              <p className="text-xs text-gray-500">{isRTL ? 'توزيع البلاغات على الحالات' : 'Distribution across statuses'}</p>
            </div>
          </div>
          
          {statusStats.length > 0 ? (
            <div className="space-y-4">
              {/* Pie-like representation */}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                {statusStats.map((s) => (
                  <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-3 h-3 rounded-full ${s.color}`} />
                    <span className="text-sm font-medium text-gray-700">{isRTL ? s.name_ar : s.name}</span>
                    <span className="text-sm font-bold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
              
              {/* Bar representation */}
              <div className="space-y-2">
                {statusStats.map((s) => {
                  const total = statusStats.reduce((sum, st) => sum + st.count, 0);
                  const percentage = total > 0 ? (s.count / total) * 100 : 0;
                  
                  return (
                    <div key={s.id} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-24 text-sm text-gray-600 truncate">{isRTL ? s.name_ar : s.name}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div className={`h-4 rounded-full ${s.color} flex items-center justify-end px-2`} style={{ width: `${Math.max(percentage, 10)}%` }}>
                          <span className="text-xs font-bold text-white">{Math.round(percentage)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data available'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Map Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-red-600" />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className="text-lg font-bold text-gray-900">{isRTL ? 'خريطة البلاغات' : 'Reports Map'}</h2>
            <p className="text-xs text-gray-500">{isRTL ? 'توزيع البلاغات الجغرافي' : 'Geographic distribution of reports'}</p>
          </div>
        </div>
        
        {isClient && (
          <div className="h-[300px] sm:h-[400px] rounded-lg overflow-hidden">
            <link
              rel="stylesheet"
              href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            />
            <MapContainer
              center={[24.7136, 46.6753]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredReports
                .filter((r) => r.latitude && r.longitude)
                .map((report) => (
                  <CircleMarker
                    key={report.id}
                    center={[Number(report.latitude), Number(report.longitude)]}
                    radius={8}
                    fillColor={report.status_id === 3 ? '#22c55e' : report.status_id === 1 ? '#eab308' : '#3b82f6'}
                    color="#fff"
                    weight={2}
                    opacity={1}
                    fillOpacity={0.8}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold">{report.title}</p>
                        <p className="text-gray-500">{new Date(report.created_at).toLocaleDateString()}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
            </MapContainer>
          </div>
        )}
        
        {/* Map Legend */}
        <div className={`flex items-center gap-4 mt-3 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-600">{isRTL ? 'قيد الانتظار' : 'Pending'}</span>
          </div>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600">{isRTL ? 'قيد المعالجة' : 'In Progress'}</span>
          </div>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">{isRTL ? 'تم الحل' : 'Resolved'}</span>
          </div>
        </div>
      </div>

      {/* Company Redemptions Chart */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
        <div className={`flex items-center gap-3 mb-4 sm:mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {isRTL ? 'الشركات الأكثر استخداماً للكوبونات' : 'Top Companies by Coupon Usage'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {isRTL ? 'الشركات مرتبة حسب عدد استخدامات الكوبونات' : 'Companies ranked by redemption count'}
            </p>
          </div>
        </div>

        {companyStats.length > 0 ? (
          <div className="space-y-4">
            {companyStats.slice(0, 10).map((company, index) => {
              const maxCount = companyStats[0]?.redemption_count || 1;
              const percentage = (company.redemption_count / maxCount) * 100;
              const colors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-purple-500',
                'bg-orange-500',
                'bg-pink-500',
                'bg-indigo-500',
                'bg-teal-500',
                'bg-red-500',
                'bg-cyan-500',
                'bg-amber-500',
              ];
              
              return (
                <div key={company.company_id} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 text-center font-semibold text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    #{index + 1}
                  </div>
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.company_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm">
                      {company.company_name?.[0]?.toUpperCase() || 'C'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-medium text-gray-900 text-sm truncate">
                        {company.company_name}
                      </span>
                      <span className="font-bold text-gray-700 text-sm">
                        {company.redemption_count.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${colors[index % colors.length]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {isRTL ? 'لا توجد بيانات استخدام الكوبونات' : 'No coupon redemption data available'}
            </p>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className={`flex items-center gap-3 mb-4 sm:mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">{isRTL ? 'قائمة المتصدرين' : 'Top Users Leaderboard'}</h2>
            <p className="text-xs sm:text-sm text-gray-600">{isRTL ? 'المستخدمون مرتبون حسب النقاط' : 'Users ranked by total points'}</p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[500px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-3 sm:px-6 py-2 sm:py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الترتيب' : 'Rank'}
                </th>
                <th className={`px-3 sm:px-6 py-2 sm:py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.users.user}
                </th>
                <th className={`px-3 sm:px-6 py-2 sm:py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.users.userPoints}
                </th>
                <th className={`px-3 sm:px-6 py-2 sm:py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الاتجاه' : 'Trend'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.map((entry, index) => (
                <tr key={entry.user_id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {index === 0 && <span className={`text-lg sm:text-2xl ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`}>🥇</span>}
                      {index === 1 && <span className={`text-lg sm:text-2xl ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`}>🥈</span>}
                      {index === 2 && <span className={`text-lg sm:text-2xl ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`}>🥉</span>}
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">#{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
                        {entry.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className={isRTL ? 'mr-2 sm:mr-3 text-right' : 'ml-2 sm:ml-3'}>
                        <p className="font-medium text-gray-900 text-sm sm:text-base">{entry.full_name || `${t.users.user} ${entry.user_id}`}</p>
                        <p className="text-xs sm:text-sm text-gray-500">ID: {entry.user_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <span className="text-yellow font-bold text-base sm:text-lg">
                      {entry.total_points.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{isRTL ? 'لا توجد بيانات للمتصدرين' : 'No leaderboard data available'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
