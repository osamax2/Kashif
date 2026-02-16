'use client';

import { analyticsAPI, couponsAPI, getImageUrl, reportsAPI, usersAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { LeaderboardEntry, Report } from '@/lib/types';
import { BarChart3, Building2, Calendar, Clock, Download, FileText, Filter, Gift, MapPin, Star, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react';
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

interface CouponStat {
  coupon_id: number;
  title: string;
  title_ar: string;
  points_cost: number;
  redemption_count: number;
  last_redeemed: string | null;
}

interface TimeData {
  date: string;
  count: number;
}

interface SummaryStats {
  total_coupons: number;
  total_redemptions: number;
  total_points_spent: number;
}

type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

// Company Analytics Component - Shows only company's own data
function CompanyAnalytics({ companyId, companyName, isRTL, t }: { companyId: number; companyName: string | null; isRTL: boolean; t: any }) {
  const [couponStats, setCouponStats] = useState<CouponStat[]>([]);
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all' | 'custom'>('30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    // Don't load if custom is selected but dates are not set
    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) return;
    loadAnalytics();
  }, [companyId, dateRange, customStartDate, customEndDate]);

  const loadAnalytics = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      // Calculate date range
      let startDate: string | undefined;
      let endDate: string | undefined = new Date().toISOString();
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate).toISOString();
        endDate = new Date(customEndDate + 'T23:59:59').toISOString();
      } else if (dateRange !== 'all') {
        const days = parseInt(dateRange);
        const start = new Date();
        start.setDate(start.getDate() - days);
        startDate = start.toISOString();
      }

      const [statsRes, timeRes, summaryRes, membersRes, couponsRes] = await Promise.allSettled([
        couponsAPI.getCompanyCouponStats(companyId, startDate, dateRange !== 'all' ? endDate : undefined),
        couponsAPI.getCompanyRedemptionsOverTime(companyId, parseInt(dateRange) || 365),
        couponsAPI.getCompanyStatsSummary(companyId),
        usersAPI.getCompanyMembers(companyId).catch(() => []),
        couponsAPI.getCompanyCoupons(companyId).catch(() => []),
      ]);

      if (statsRes.status === 'fulfilled') {
        setCouponStats(statsRes.value || []);
      }
      if (timeRes.status === 'fulfilled') {
        setTimeData(timeRes.value || []);
      }
      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value);
      }
      if (membersRes.status === 'fulfilled') {
        setTeamMembers(Array.isArray(membersRes.value) ? membersRes.value : []);
      }
      if (couponsRes.status === 'fulfilled') {
        setCoupons(Array.isArray(couponsRes.value) ? couponsRes.value : []);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxRedemptions = Math.max(...couponStats.map(c => c.redemption_count), 1);
  const activeCoupons = coupons.filter((c: any) => c.status === 'ACTIVE').length;
  const activeMembers = teamMembers.filter((m: any) => m.status === 'ACTIVE').length;
  const [exporting, setExporting] = useState(false);

  // Export Company Analytics to CSV
  const exportCompanyAnalytics = () => {
    try {
      setExporting(true);
      
      // Build CSV content
      let csvContent = '';
      const BOM = '\uFEFF';
      
      // Summary Section
      csvContent += `${isRTL ? 'ملخص التحليلات' : 'Analytics Summary'}\n`;
      csvContent += `${isRTL ? 'الشركة' : 'Company'},${companyName || ''}\n`;
      csvContent += `${isRTL ? 'الفترة' : 'Period'},${dateRange === 'all' ? (isRTL ? 'كل الوقت' : 'All time') : `${isRTL ? 'آخر' : 'Last'} ${dateRange} ${isRTL ? 'يوم' : 'days'}`}\n`;
      csvContent += `${isRTL ? 'إجمالي الكوبونات' : 'Total Coupons'},${summary?.total_coupons || coupons.length}\n`;
      csvContent += `${isRTL ? 'الكوبونات النشطة' : 'Active Coupons'},${activeCoupons}\n`;
      csvContent += `${isRTL ? 'إجمالي الاستبدالات' : 'Total Redemptions'},${summary?.total_redemptions || 0}\n`;
      csvContent += `${isRTL ? 'النقاط المستخدمة' : 'Points Used'},${summary?.total_points_spent || 0}\n`;
      csvContent += `${isRTL ? 'أعضاء الفريق' : 'Team Members'},${teamMembers.length}\n`;
      csvContent += `${isRTL ? 'الأعضاء النشطين' : 'Active Members'},${activeMembers}\n\n`;
      
      // Coupon Performance Section
      if (couponStats.length > 0) {
        csvContent += `${isRTL ? 'أداء الكوبونات' : 'Coupon Performance'}\n`;
        csvContent += `${isRTL ? 'الترتيب' : 'Rank'},${isRTL ? 'الكوبون' : 'Coupon'},${isRTL ? 'النقاط' : 'Points'},${isRTL ? 'الاستبدالات' : 'Redemptions'},${isRTL ? 'آخر استبدال' : 'Last Redeemed'}\n`;
        couponStats.forEach((c, i) => {
          csvContent += `${i + 1},"${isRTL ? c.title_ar || c.title : c.title}",${c.points_cost},${c.redemption_count},${c.last_redeemed ? new Date(c.last_redeemed).toLocaleDateString() : 'N/A'}\n`;
        });
        csvContent += '\n';
      }
      
      // Time Data Section
      if (timeData.length > 0) {
        csvContent += `${isRTL ? 'الاستبدالات عبر الوقت' : 'Redemptions Over Time'}\n`;
        csvContent += `${isRTL ? 'التاريخ' : 'Date'},${isRTL ? 'العدد' : 'Count'}\n`;
        timeData.forEach(d => {
          csvContent += `${d.date},${d.count}\n`;
        });
        csvContent += '\n';
      }
      
      // All Coupons Section
      if (coupons.length > 0) {
        csvContent += `${isRTL ? 'جميع الكوبونات' : 'All Coupons'}\n`;
        csvContent += `ID,${isRTL ? 'الاسم' : 'Name'},${isRTL ? 'النقاط' : 'Points'},${isRTL ? 'الحالة' : 'Status'}\n`;
        coupons.forEach((c: any) => {
          csvContent += `${c.id},"${isRTL ? c.title_ar || c.title : c.title}",${c.points_cost},${c.status}\n`;
        });
      }
      
      // Download
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `company_analytics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isRTL ? 'تحليلات الشركة' : 'Company Analytics'}
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            {companyName && <span className="font-semibold">{companyName}</span>}
            {' - '}
            {isRTL ? 'إحصائيات ورؤى الكوبونات' : 'Coupon statistics and insights'}
          </p>
        </div>
        <div className={`flex items-center gap-2 flex-wrap`}>
          <Calendar className="w-5 h-5 text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7' | '30' | '90' | 'all' | 'custom')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
          >
            <option value="7">{isRTL ? 'آخر 7 أيام' : 'Last 7 days'}</option>
            <option value="30">{isRTL ? 'آخر 30 يوم' : 'Last 30 days'}</option>
            <option value="90">{isRTL ? 'آخر 90 يوم' : 'Last 90 days'}</option>
            <option value="all">{isRTL ? 'كل الوقت' : 'All time'}</option>
            <option value="custom">{isRTL ? 'نطاق مخصص' : 'Custom range'}</option>
          </select>
          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
                placeholder={isRTL ? 'من تاريخ' : 'Start date'}
              />
              <span className="text-gray-500">{isRTL ? 'إلى' : 'to'}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
                placeholder={isRTL ? 'إلى تاريخ' : 'End date'}
              />
            </>
          )}
          <button
            onClick={exportCompanyAnalytics}
            disabled={exporting}
            className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50`}
          >
            <Download className="w-4 h-4" />
            {exporting 
              ? (isRTL ? 'جاري التصدير...' : 'Exporting...') 
              : (isRTL ? 'تصدير CSV' : 'Export CSV')
            }
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-purple-500 ${isRTL ? 'text-right border-l-0 border-r-4' : ''}`}>
          <div className={`flex items-center gap-3`}>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">{isRTL ? 'الكوبونات' : 'Coupons'}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{summary?.total_coupons || coupons.length}</p>
              <p className="text-xs text-purple-600">{activeCoupons} {isRTL ? 'نشط' : 'active'}</p>
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-green-500 ${isRTL ? 'text-right border-l-0 border-r-4' : ''}`}>
          <div className={`flex items-center gap-3`}>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">{isRTL ? 'الاستبدالات' : 'Redemptions'}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{summary?.total_redemptions || 0}</p>
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-yellow-500 ${isRTL ? 'text-right border-l-0 border-r-4' : ''}`}>
          <div className={`flex items-center gap-3`}>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">{isRTL ? 'النقاط المستخدمة' : 'Points Used'}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{(summary?.total_points_spent || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-blue-500 ${isRTL ? 'text-right border-l-0 border-r-4' : ''}`}>
          <div className={`flex items-center gap-3`}>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-xs sm:text-sm">{isRTL ? 'الفريق' : 'Team'}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{teamMembers.length}</p>
              <p className="text-xs text-blue-600">{activeMembers} {isRTL ? 'نشط' : 'active'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Performance */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <div className={`flex items-center gap-3 mb-4`}>
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className="text-lg font-bold text-gray-900">
              {isRTL ? 'أداء الكوبونات' : 'Coupon Performance'}
            </h2>
            <p className="text-xs text-gray-500">
              {isRTL ? 'أكثر الكوبونات استخداماً' : 'Most used coupons'}
            </p>
          </div>
        </div>

        {couponStats.length > 0 ? (
          <div className="space-y-3">
            {couponStats.slice(0, 10).map((coupon, index) => (
              <div key={coupon.coupon_id} className={`flex items-center gap-3`}>
                <div className="w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full text-xs font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center justify-between mb-1`}>
                    <span className="font-medium text-gray-900 truncate text-sm">
                      {isRTL ? coupon.title_ar || coupon.title : coupon.title}
                    </span>
                    <span className="text-sm font-semibold text-purple-600 ml-2">
                      {coupon.redemption_count} {isRTL ? 'استبدال' : 'uses'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(coupon.redemption_count / maxRedemptions) * 100}%` }}
                    />
                  </div>
                  <div className={`flex items-center justify-between mt-1`}>
                    <span className="text-xs text-gray-500">
                      {coupon.points_cost} {isRTL ? 'نقطة' : 'points'}
                    </span>
                    {coupon.last_redeemed && (
                      <span className="text-xs text-gray-400">
                        {isRTL ? 'آخر استبدال: ' : 'Last: '}
                        {new Date(coupon.last_redeemed).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{isRTL ? 'لا توجد بيانات استبدال حتى الآن' : 'No redemption data yet'}</p>
          </div>
        )}
      </div>

      {/* Redemptions Over Time */}
      {timeData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className={`flex items-center gap-3 mb-4`}>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className={isRTL ? 'text-right' : ''}>
              <h2 className="text-lg font-bold text-gray-900">
                {isRTL ? 'الاستبدالات عبر الوقت' : 'Redemptions Over Time'}
              </h2>
              <p className="text-xs text-gray-500">
                {isRTL ? 'نشاط استخدام الكوبونات' : 'Coupon usage activity'}
              </p>
            </div>
          </div>

          <div className="h-40 flex items-end gap-1">
            {timeData.map((day, index) => {
              const maxCount = Math.max(...timeData.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t hover:from-green-600 hover:to-green-500 transition-all cursor-pointer group relative"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${day.date}: ${day.count} ${isRTL ? 'استبدال' : 'redemptions'}`}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {day.count}
                  </div>
                </div>
              );
            })}
          </div>
          <div className={`flex justify-between mt-2 text-xs text-gray-500`}>
            <span>{timeData[0]?.date}</span>
            <span>{timeData[timeData.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* All Coupons List */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className={`flex items-center gap-3 mb-4`}>
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Gift className="w-5 h-5 text-indigo-600" />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className="text-lg font-bold text-gray-900">
              {isRTL ? 'جميع الكوبونات' : 'All Coupons'}
            </h2>
            <p className="text-xs text-gray-500">
              {coupons.length} {isRTL ? 'كوبون' : 'coupons'}
            </p>
          </div>
        </div>

        {coupons.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[400px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-3 sm:px-4 py-2 text-xs font-semibold text-gray-600 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'الكوبون' : 'Coupon'}
                  </th>
                  <th className={`px-3 sm:px-4 py-2 text-xs font-semibold text-gray-600 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'النقاط' : 'Points'}
                  </th>
                  <th className={`px-3 sm:px-4 py-2 text-xs font-semibold text-gray-600 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'الحالة' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {coupons.map((coupon: any) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className={`px-3 sm:px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                      <p className="font-medium text-gray-900 text-sm">
                        {isRTL ? coupon.title_ar || coupon.title : coupon.title}
                      </p>
                    </td>
                    <td className={`px-3 sm:px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                      <span className="font-semibold text-purple-600">{coupon.points_cost}</span>
                    </td>
                    <td className={`px-3 sm:px-4 py-3 ${isRTL ? 'text-right' : ''}`}>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        coupon.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {coupon.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{isRTL ? 'لا توجد كوبونات' : 'No coupons yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { t, isRTL } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyRedemptionStats[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
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
    
    // Check user role from localStorage, fallback to profile
    let role = localStorage.getItem('user_role');
    
    // Fallback: Get role from user_profile if user_role not set
    if (!role) {
      const userProfile = localStorage.getItem('user_profile');
      if (userProfile) {
        try {
          const profile = JSON.parse(userProfile);
          role = profile.role || null;
          // Save it for future use
          if (role) {
            localStorage.setItem('user_role', role);
          }
        } catch (e) {
          console.error('Error parsing user profile for role:', e);
        }
      }
    }
    setUserRole(role);
    
    // Get company info for COMPANY users
    const userProfile = localStorage.getItem('user_profile');
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        if (profile.company_id) {
          setCompanyId(profile.company_id);
        }
        if (profile.company_name) {
          setCompanyName(profile.company_name);
        }
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }
    
    // Only load full analytics for non-company users
    if (role?.toUpperCase() !== 'COMPANY') {
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Don't filter if custom is selected but dates are not set
    if (timeFilter === 'custom' && (!customStartDate || !customEndDate)) return;
    filterDataByTime();
  }, [timeFilter, reports, users, categories, statuses, customStartDate, customEndDate]);

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
    let endDate: Date = now;

    if (timeFilter === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate + 'T23:59:59');
    } else {
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
    }

    const filtered = reports.filter((r) => {
      const reportDate = new Date(r.created_at);
      return reportDate >= startDate && reportDate <= endDate;
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
      custom: isRTL ? 'نطاق مخصص' : 'Custom Range',
    };
    return labels[filter];
  };

  // Export Platform Analytics to CSV
  const [exporting, setExporting] = useState(false);
  
  const exportPlatformAnalytics = () => {
    try {
      setExporting(true);
      
      let csvContent = '';
      const BOM = '\uFEFF';
      
      // Summary Section
      csvContent += `${isRTL ? 'ملخص تحليلات المنصة' : 'Platform Analytics Summary'}\n`;
      csvContent += `${isRTL ? 'الفترة' : 'Period'},${getTimeFilterLabel(timeFilter)}\n`;
      csvContent += `${isRTL ? 'تاريخ التصدير' : 'Export Date'},${new Date().toLocaleDateString()}\n\n`;
      
      // Main Stats
      csvContent += `${isRTL ? 'الإحصائيات الرئيسية' : 'Main Statistics'}\n`;
      csvContent += `${isRTL ? 'إجمالي البلاغات' : 'Total Reports'},${filteredReports.length}\n`;
      csvContent += `${isRTL ? 'البلاغات المحلولة' : 'Resolved Reports'},${stats.resolvedReports}\n`;
      csvContent += `${isRTL ? 'البلاغات قيد الانتظار' : 'Pending Reports'},${stats.pendingReports}\n`;
      csvContent += `${isRTL ? 'معدل الحل' : 'Resolution Rate'},${stats.totalReports > 0 ? Math.round((stats.resolvedReports / stats.totalReports) * 100) : 0}%\n`;
      csvContent += `${isRTL ? 'إجمالي المستخدمين' : 'Total Users'},${stats.totalUsers}\n`;
      csvContent += `${isRTL ? 'المستخدمين النشطين' : 'Active Users'},${stats.activeUsers}\n`;
      csvContent += `${isRTL ? 'إجمالي الشركات' : 'Total Companies'},${stats.totalCompanies}\n`;
      csvContent += `${isRTL ? 'الشركات النشطة' : 'Active Companies'},${stats.activeCompanies}\n`;
      csvContent += `${isRTL ? 'استخدام الكوبونات' : 'Coupon Redemptions'},${stats.totalRedemptions}\n\n`;
      
      // Category Stats
      if (categoryStats.length > 0) {
        csvContent += `${isRTL ? 'البلاغات حسب الفئة' : 'Reports by Category'}\n`;
        csvContent += `${isRTL ? 'الفئة' : 'Category'},${isRTL ? 'العدد' : 'Count'}\n`;
        categoryStats.forEach(cat => {
          csvContent += `"${isRTL ? cat.name_ar : cat.name}",${cat.count}\n`;
        });
        csvContent += '\n';
      }
      
      // Status Stats
      if (statusStats.length > 0) {
        csvContent += `${isRTL ? 'البلاغات حسب الحالة' : 'Reports by Status'}\n`;
        csvContent += `${isRTL ? 'الحالة' : 'Status'},${isRTL ? 'العدد' : 'Count'}\n`;
        statusStats.forEach(s => {
          csvContent += `"${isRTL ? s.name_ar : s.name}",${s.count}\n`;
        });
        csvContent += '\n';
      }
      
      // Leaderboard
      if (leaderboard.length > 0) {
        csvContent += `${isRTL ? 'لوحة المتصدرين' : 'Leaderboard'}\n`;
        csvContent += `${isRTL ? 'الترتيب' : 'Rank'},${isRTL ? 'المستخدم' : 'User'},${isRTL ? 'النقاط' : 'Points'}\n`;
        leaderboard.slice(0, 20).forEach((entry, i) => {
          csvContent += `${i + 1},"${entry.full_name || `User ${entry.user_id}`}",${entry.total_points}\n`;
        });
        csvContent += '\n';
      }
      
      // Company Redemptions
      if (companyStats.length > 0) {
        csvContent += `${isRTL ? 'استبدالات الشركات' : 'Company Redemptions'}\n`;
        csvContent += `${isRTL ? 'الشركة' : 'Company'},${isRTL ? 'الاستبدالات' : 'Redemptions'}\n`;
        companyStats.forEach(c => {
          csvContent += `"${c.company_name}",${c.redemption_count}\n`;
        });
        csvContent += '\n';
      }
      
      // Reports List
      if (filteredReports.length > 0) {
        csvContent += `${isRTL ? 'قائمة البلاغات' : 'Reports List'}\n`;
        csvContent += `ID,${isRTL ? 'العنوان' : 'Title'},${isRTL ? 'الفئة' : 'Category'},${isRTL ? 'الحالة' : 'Status'},${isRTL ? 'التاريخ' : 'Date'}\n`;
        filteredReports.slice(0, 500).forEach(r => {
          const cat = categories.find(c => c.id === r.category_id);
          const status = statuses.find(s => s.id === r.status_id);
          csvContent += `${r.id},"${r.title}","${isRTL ? (cat?.name_ar || cat?.name) : cat?.name}","${status?.name}",${new Date(r.created_at).toLocaleDateString()}\n`;
        });
      }
      
      // Download
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `platform_analytics_${timeFilter}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
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

  // Show Company Analytics for COMPANY users
  if (userRole?.toUpperCase() === 'COMPANY') {
    if (!companyId) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-gray-500">
            <p>{isRTL ? 'لم يتم العثور على بيانات الشركة' : 'Company data not found'}</p>
          </div>
        </div>
      );
    }
    return <CompanyAnalytics companyId={companyId} companyName={companyName} isRTL={isRTL} t={t} />;
  }

  // Admin/Government full analytics view
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header with Time Filter */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.analytics.title}</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{isRTL ? 'إحصائيات ورؤى المنصة' : 'Platform statistics and insights'}</p>
        </div>
        <div className={`flex items-center gap-2 flex-wrap`}>
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
            <option value="custom">{getTimeFilterLabel('custom')}</option>
          </select>
          {timeFilter === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-sm"
                placeholder={isRTL ? 'من تاريخ' : 'Start date'}
              />
              <span className="text-gray-500">{isRTL ? 'إلى' : 'to'}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-sm"
                placeholder={isRTL ? 'إلى تاريخ' : 'End date'}
              />
            </>
          )}
          <button
            onClick={exportPlatformAnalytics}
            disabled={exporting}
            className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50`}
          >
            <Download className="w-4 h-4" />
            {exporting 
              ? (isRTL ? 'جاري التصدير...' : 'Exporting...') 
              : (isRTL ? 'تصدير CSV' : 'Export CSV')
            }
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Reports Stats */}
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-blue-500 ${isRTL ? 'text-right border-l-0 border-r-4' : ''}`}>
          <div className={`flex items-center gap-3`}>
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
          <div className={`flex items-center gap-3`}>
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
          <div className={`flex items-center gap-3`}>
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
          <div className={`flex items-center gap-3`}>
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

      {/* ═══════ Extended Dashboard: Day/Week Comparison ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Day vs Previous Day */}
        {(() => {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
          const todayReports = reports.filter((r) => new Date(r.created_at) >= todayStart).length;
          const yesterdayReports = reports.filter((r) => {
            const d = new Date(r.created_at);
            return d >= yesterdayStart && d < todayStart;
          }).length;
          const dayDiff = yesterdayReports > 0 ? Math.round(((todayReports - yesterdayReports) / yesterdayReports) * 100) : (todayReports > 0 ? 100 : 0);
          const isUp = dayDiff >= 0;

          return (
            <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 ${isRTL ? 'text-right' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-gray-900 text-sm">{isRTL ? 'مقارنة يومية' : 'Day Comparison'}</h3>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'اليوم' : 'Today'}</p>
                  <p className="text-2xl font-bold text-gray-900">{todayReports}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'أمس' : 'Yesterday'}</p>
                  <p className="text-2xl font-bold text-gray-400">{yesterdayReports}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {dayDiff > 0 ? '+' : ''}{dayDiff}%
                </div>
              </div>
            </div>
          );
        })()}

        {/* Week vs Previous Week */}
        {(() => {
          const now = new Date();
          const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          const thisWeek = reports.filter((r) => new Date(r.created_at) >= weekStart).length;
          const prevWeek = reports.filter((r) => {
            const d = new Date(r.created_at);
            return d >= prevWeekStart && d < weekStart;
          }).length;
          const weekDiff = prevWeek > 0 ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : (thisWeek > 0 ? 100 : 0);
          const isUp = weekDiff >= 0;

          return (
            <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-5 ${isRTL ? 'text-right' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-gray-900 text-sm">{isRTL ? 'مقارنة أسبوعية' : 'Week Comparison'}</h3>
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'هذا الأسبوع' : 'This Week'}</p>
                  <p className="text-2xl font-bold text-gray-900">{thisWeek}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'الأسبوع الماضي' : 'Last Week'}</p>
                  <p className="text-2xl font-bold text-gray-400">{prevWeek}</p>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {weekDiff > 0 ? '+' : ''}{weekDiff}%
                </div>
              </div>
            </div>
          );
        })()}

        {/* Top Reporter of the Month */}
        {(() => {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthReports = reports.filter((r) => new Date(r.created_at) >= monthStart);
          const userCounts: { [uid: number]: number } = {};
          monthReports.forEach((r) => {
            userCounts[r.user_id] = (userCounts[r.user_id] || 0) + 1;
          });
          const topUserId = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0];
          const topUser = topUserId ? users.find((u: any) => u.id === Number(topUserId[0])) : null;

          return (
            <div className={`bg-gradient-to-br from-yellow/20 to-yellow/5 rounded-xl shadow-sm p-4 sm:p-5 border border-yellow/30 ${isRTL ? 'text-right' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-yellow-600" />
                <h3 className="font-bold text-gray-900 text-sm">{isRTL ? 'أفضل مُبلّغ هذا الشهر' : 'Top Reporter This Month'}</h3>
              </div>
              {topUser ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg">
                    {topUser.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{topUser.full_name}</p>
                    <p className="text-xs text-gray-600">{topUserId?.[1]} {isRTL ? 'بلاغات هذا الشهر' : 'reports this month'}</p>
                  </div>
                  <span className="text-2xl ml-auto">🏆</span>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">{isRTL ? 'لا توجد بلاغات هذا الشهر' : 'No reports this month'}</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* ═══════ Average Resolution Time per Category ═══════ */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          <div className={isRTL ? 'text-right' : ''}>
            <h2 className="text-lg font-bold text-gray-900">{isRTL ? 'متوسط وقت الحل حسب الفئة' : 'Avg. Resolution Time by Category'}</h2>
            <p className="text-xs text-gray-500">{isRTL ? 'الوقت المتوسط لحل البلاغات بالأيام' : 'Average days to resolve reports'}</p>
          </div>
        </div>

        {(() => {
          // Calculate average resolution time per category
          const resolvedReports = reports.filter((r) => r.status_id === 3 && r.updated_at);
          const catTimes: { [catId: number]: { total: number; count: number } } = {};

          resolvedReports.forEach((r) => {
            const created = new Date(r.created_at).getTime();
            const resolved = new Date(r.updated_at!).getTime();
            const daysDiff = Math.max(0, (resolved - created) / (1000 * 60 * 60 * 24));

            if (!catTimes[r.category_id]) {
              catTimes[r.category_id] = { total: 0, count: 0 };
            }
            catTimes[r.category_id].total += daysDiff;
            catTimes[r.category_id].count++;
          });

          const avgTimes = categories
            .filter((c) => catTimes[c.id]?.count > 0)
            .map((c) => ({
              id: c.id,
              name: isRTL ? c.name_ar : c.name,
              avgDays: catTimes[c.id].total / catTimes[c.id].count,
              count: catTimes[c.id].count,
            }))
            .sort((a, b) => a.avgDays - b.avgDays);

          const maxDays = avgTimes.length > 0 ? Math.max(...avgTimes.map((a) => a.avgDays)) : 1;

          if (avgTimes.length === 0) {
            return (
              <div className="text-center py-8">
                <p className="text-gray-500">{isRTL ? 'لا توجد بيانات كافية' : 'Not enough data'}</p>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {avgTimes.map((item, i) => {
                const pct = (item.avgDays / maxDays) * 100;
                const color = item.avgDays <= 2 ? 'bg-green-500' : item.avgDays <= 7 ? 'bg-yellow-500' : 'bg-red-500';

                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-700 truncate font-medium">{item.name}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div className={`h-4 rounded-full ${color}`} style={{ width: `${Math.max(pct, 8)}%` }}>
                        <span className="text-xs font-bold text-white px-2">{item.avgDays.toFixed(1)}d</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{item.count} {isRTL ? 'بلاغ' : 'reports'}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Reports by Category */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <div className={`flex items-center gap-3 mb-4`}>
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
                  <div key={cat.id} className={`flex items-center gap-3`}>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center justify-between mb-1`}>
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
          <div className={`flex items-center gap-3 mb-4`}>
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
                  <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50`}>
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
                    <div key={s.id} className={`flex items-center gap-2`}>
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
        <div className={`flex items-center gap-3 mb-4`}>
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
        <div className={`flex items-center gap-4 mt-3 flex-wrap`}>
          <div className={`flex items-center gap-2`}>
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-600">{isRTL ? 'قيد الانتظار' : 'Pending'}</span>
          </div>
          <div className={`flex items-center gap-2`}>
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600">{isRTL ? 'قيد المعالجة' : 'In Progress'}</span>
          </div>
          <div className={`flex items-center gap-2`}>
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">{isRTL ? 'تم الحل' : 'Resolved'}</span>
          </div>
        </div>
      </div>

      {/* Company Redemptions Chart */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
        <div className={`flex items-center gap-3 mb-4 sm:mb-6`}>
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
                <div key={company.company_id} className={`flex items-center gap-3`}>
                  <div className={`w-8 text-center font-semibold text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                    #{index + 1}
                  </div>
                  {company.logo_url ? (
                    <img
                      src={getImageUrl(company.logo_url)}
                      alt={company.company_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm">
                      {company.company_name?.[0]?.toUpperCase() || 'C'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`flex items-center justify-between mb-1`}>
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
        <div className={`flex items-center gap-3 mb-4 sm:mb-6`}>
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
                    <div className={`flex items-center`}>
                      {index === 0 && <span className={`text-lg sm:text-2xl ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`}>🥇</span>}
                      {index === 1 && <span className={`text-lg sm:text-2xl ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`}>🥈</span>}
                      {index === 2 && <span className={`text-lg sm:text-2xl ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`}>🥉</span>}
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">#{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className={`flex items-center`}>
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
