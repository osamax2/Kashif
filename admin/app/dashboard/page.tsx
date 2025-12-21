'use client';

import { couponsAPI, reportsAPI, usersAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { FileText, Gift, Map, UserCheck, Users, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    totalCoupons: 0,
    totalRedemptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem('user_role');
    console.log('Dashboard - User role from localStorage:', role);
    setUserRole(role);
    
    // Get company name for COMPANY users
    const userProfile = localStorage.getItem('user_profile');
    console.log('Dashboard - User profile from localStorage:', userProfile);
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        console.log('Dashboard - Parsed profile:', profile);
        if (profile.company_name) {
          setCompanyName(profile.company_name);
        }
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }
    
    // Load stats for all users (ADMIN or otherwise)
    // Previously was only loading for ADMIN users which was causing issue
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard stats...');
      
      const [usersRes, reportsRes, couponsRes] = await Promise.allSettled([
        usersAPI.getUsers(0, 1000),
        reportsAPI.getReports({ limit: 1000 }),
        couponsAPI.getCoupons({ limit: 1000 }),
      ]);

      console.log('Users response:', usersRes);
      console.log('Reports response:', reportsRes);
      console.log('Coupons response:', couponsRes);

      // Handle different API response formats (array or { items: [...] } or { data: [...] })
      const extractArray = (result: PromiseSettledResult<any>): any[] => {
        if (result.status !== 'fulfilled') return [];
        const value = result.value;
        if (Array.isArray(value)) return value;
        if (value?.items && Array.isArray(value.items)) return value.items;
        if (value?.data && Array.isArray(value.data)) return value.data;
        if (value?.users && Array.isArray(value.users)) return value.users;
        if (value?.reports && Array.isArray(value.reports)) return value.reports;
        if (value?.coupons && Array.isArray(value.coupons)) return value.coupons;
        return [];
      };

      const users = extractArray(usersRes);
      const reports = extractArray(reportsRes);
      const coupons = extractArray(couponsRes);

      console.log('Extracted arrays:', { 
        usersCount: users.length, 
        reportsCount: reports.length, 
        couponsCount: coupons.length,
        usersSample: users.slice(0, 2),
        reportsSample: reports.slice(0, 2),
        couponsSample: coupons.slice(0, 2)
      });

      // Count active users (users with status ACTIVE)
      const activeUsers = users.filter((u: any) => u.status === 'ACTIVE').length;

      setStats({
        totalUsers: users.length,
        totalReports: reports.length,
        totalCoupons: coupons.length,
        totalRedemptions: activeUsers,
      });

      console.log('Stats updated:', {
        totalUsers: users.length,
        totalReports: reports.length,
        totalCoupons: coupons.length,
        activeUsers,
      });
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: t.dashboard.totalUsers,
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      href: '/dashboard/users',
    },
    {
      title: t.dashboard.totalReports,
      value: stats.totalReports,
      icon: FileText,
      color: 'bg-green-500',
      href: '/dashboard/reports',
    },
    {
      title: t.dashboard.totalCoupons,
      value: stats.totalCoupons,
      icon: Gift,
      color: 'bg-purple-500',
      href: '/dashboard/coupons',
    },
    {
      title: t.dashboard.activeUsers,
      value: stats.totalRedemptions,
      icon: UserCheck,
      color: 'bg-yellow-500',
      href: '/dashboard/users',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Company User Dashboard - simplified view (case insensitive check)
  if (userRole?.toUpperCase() === 'COMPANY') {
    return (
      <div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.dashboard.companyDashboard}</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            {t.dashboard.companyWelcome}
            {companyName && <span className="font-semibold"> - {companyName}</span>}
          </p>
        </div>

        {/* Company User - Coupons and Team Access */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">{t.common.actions}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/dashboard/coupons"
              className="block p-4 sm:p-6 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
            >
              <div className={`flex items-center gap-3 sm:gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="bg-purple-500 p-2 sm:p-3 rounded-lg">
                  <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{t.dashboard.manageCoupons}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{t.coupons.title}</p>
                </div>
              </div>
            </a>
            <a
              href="/dashboard/team"
              className="block p-4 sm:p-6 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className={`flex items-center gap-3 sm:gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="bg-blue-500 p-2 sm:p-3 rounded-lg">
                  <UsersRound className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{isRTL ? 'فريق العمل' : 'Team Members'}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{isRTL ? 'إدارة أعضاء الفريق' : 'Manage team members'}</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Government User Dashboard - Reports and Map access only
  if (userRole?.toUpperCase() === 'GOVERNMENT') {
    return (
      <div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isRTL ? 'لوحة التحكم الحكومية' : 'Government Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            {isRTL ? 'مرحباً بك في لوحة تحكم الموظف الحكومي' : 'Welcome to the Government Employee Dashboard'}
          </p>
        </div>

        {/* Stats for Government - Reports only */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div
            onClick={() => router.push('/dashboard/reports')}
            className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition cursor-pointer"
          >
            <div className={`flex items-center justify-between mb-3 sm:mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="bg-green-500 p-2 sm:p-3 rounded-lg">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <h3 className={`text-gray-600 text-xs sm:text-sm font-medium ${isRTL ? 'text-right' : ''}`}>{t.dashboard.totalReports}</h3>
            <p className={`text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 ${isRTL ? 'text-right' : ''}`}>
              {stats.totalReports.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Government User - Reports and Map Access */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className={`text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 ${isRTL ? 'text-right' : ''}`}>{t.common.actions}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/dashboard/reports"
              className="block p-4 sm:p-6 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
            >
              <div className={`flex items-center gap-3 sm:gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="bg-green-500 p-2 sm:p-3 rounded-lg">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{t.reports.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{t.nav.reports}</p>
                </div>
              </div>
            </a>
            <a
              href="/dashboard/map"
              className="block p-4 sm:p-6 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className={`flex items-center gap-3 sm:gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="bg-blue-500 p-2 sm:p-3 rounded-lg">
                  <Map className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{isRTL ? 'الخريطة' : 'Map'}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">{isRTL ? 'عرض البلاغات على الخريطة' : 'View reports on map'}</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard - full view
  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.dashboard.title}</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{t.dashboard.welcome}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={() => router.push(card.href)}
            className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition cursor-pointer"
          >
            <div className={`flex items-center justify-between mb-3 sm:mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`${card.color} p-2 sm:p-3 rounded-lg`}>
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <h3 className={`text-gray-600 text-xs sm:text-sm font-medium ${isRTL ? 'text-right' : ''}`}>{card.title}</h3>
            <p className={`text-xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 ${isRTL ? 'text-right' : ''}`}>
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions - Only for Admin users */}
      {userRole?.toUpperCase() === 'ADMIN' && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h2 className={`text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 ${isRTL ? 'text-right' : ''}`}>{t.dashboard.quickStats}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <a
              href="/dashboard/users"
              className="block p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition"
            >
              <h3 className={`font-semibold text-gray-900 text-sm sm:text-base ${isRTL ? 'text-right' : ''}`}>{t.users.title}</h3>
              <p className={`text-xs sm:text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : ''}`}>{t.nav.users}</p>
            </a>
            <a
              href="/dashboard/reports"
              className="block p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition"
            >
              <h3 className={`font-semibold text-gray-900 text-sm sm:text-base ${isRTL ? 'text-right' : ''}`}>{t.reports.title}</h3>
              <p className={`text-xs sm:text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : ''}`}>{t.nav.reports}</p>
            </a>
            <a
              href="/dashboard/coupons"
              className="block p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition"
            >
              <h3 className={`font-semibold text-gray-900 text-sm sm:text-base ${isRTL ? 'text-right' : ''}`}>{t.coupons.title}</h3>
              <p className={`text-xs sm:text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : ''}`}>{t.nav.coupons}</p>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
