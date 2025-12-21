'use client';

import { analyticsAPI, couponsAPI, reportsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { LeaderboardEntry } from '@/lib/types';
import { BarChart3, TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CompanyRedemptionStats {
  company_id: number;
  company_name: string;
  logo_url: string | null;
  redemption_count: number;
}

export default function AnalyticsPage() {
  const { t, isRTL } = useLanguage();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyRedemptionStats[]>([]);
  const [stats, setStats] = useState({
    totalReports: 0,
    resolvedReports: 0,
    totalCoupons: 0,
    totalRedemptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leaderboardData, reports, coupons, users, companyRedemptions] = await Promise.all([
        analyticsAPI.getLeaderboard(100),
        reportsAPI.getReports({ limit: 1000 }),
        couponsAPI.getRedemptions(),
        import('@/lib/api').then(m => m.usersAPI.getUsers(0, 1000).catch(() => [])),
        couponsAPI.getRedemptionsByCompany().catch(() => []),
      ]);

      // Set company stats
      setCompanyStats(Array.isArray(companyRedemptions) ? companyRedemptions : []);

      // Enrich leaderboard with user names
      const usersArray = Array.isArray(users) ? users : [];
      const enrichedLeaderboard = (Array.isArray(leaderboardData) ? leaderboardData : []).map((entry: any) => {
        const user = usersArray.find((u: any) => u.id === entry.user_id);
        return {
          ...entry,
          full_name: user?.full_name || `User ${entry.user_id}`,
        };
      });
      setLeaderboard(enrichedLeaderboard);

      const reportsArray = Array.isArray(reports) ? reports : [];
      // Status ID 3 = RESOLVED
      const resolved = reportsArray.filter((r: any) => r.status_id === 3).length;

      setStats({
        totalReports: reportsArray.length,
        resolvedReports: resolved,
        totalCoupons: 0,
        totalRedemptions: Array.isArray(coupons) ? coupons.length : 0,
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
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
      <div className={`mb-6 sm:mb-8 ${isRTL ? 'text-right' : ''}`}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.analytics.title}</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{isRTL ? 'إحصائيات ورؤى المنصة' : 'Platform statistics and insights'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 ${isRTL ? 'text-right' : ''}`}>
          <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{isRTL ? 'إجمالي البلاغات' : 'Total Reports'}</h3>
          <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.totalReports}</p>
        </div>
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 ${isRTL ? 'text-right' : ''}`}>
          <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{isRTL ? 'البلاغات المحلولة' : 'Resolved Reports'}</h3>
          <p className="text-xl sm:text-3xl font-bold text-green-600">{stats.resolvedReports}</p>
        </div>
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 ${isRTL ? 'text-right' : ''}`}>
          <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{isRTL ? 'معدل الحل' : 'Resolution Rate'}</h3>
          <p className="text-xl sm:text-3xl font-bold text-blue-600">
            {stats.totalReports > 0
              ? Math.round((stats.resolvedReports / stats.totalReports) * 100)
              : 0}
            %
          </p>
        </div>
        <div className={`bg-white rounded-xl shadow-sm p-4 sm:p-6 ${isRTL ? 'text-right' : ''}`}>
          <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1 sm:mb-2">{isRTL ? 'إجمالي الاستخدامات' : 'Total Redemptions'}</h3>
          <p className="text-xl sm:text-3xl font-bold text-yellow">{stats.totalRedemptions}</p>
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
