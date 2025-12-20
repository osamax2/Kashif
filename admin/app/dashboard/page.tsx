'use client';

import { couponsAPI, reportsAPI, usersAPI } from '@/lib/api';
import { FileText, Gift, TrendingUp, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const router = useRouter();
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
    setUserRole(role);
    
    // Get company name for COMPANY users
    const userProfile = localStorage.getItem('user_profile');
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        if (profile.company_name) {
          setCompanyName(profile.company_name);
        }
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }
    
    // Only load stats for ADMIN users
    if (role === 'ADMIN') {
      loadStats();
    } else {
      setLoading(false);
    }
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

      const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value) ? usersRes.value : [];
      const reports = reportsRes.status === 'fulfilled' && Array.isArray(reportsRes.value) ? reportsRes.value : [];
      const coupons = couponsRes.status === 'fulfilled' && Array.isArray(couponsRes.value) ? couponsRes.value : [];

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
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      href: '/dashboard/users',
    },
    {
      title: 'Total Reports',
      value: stats.totalReports,
      icon: FileText,
      color: 'bg-green-500',
      href: '/dashboard/reports',
    },
    {
      title: 'Total Coupons',
      value: stats.totalCoupons,
      icon: Gift,
      color: 'bg-purple-500',
      href: '/dashboard/coupons',
    },
    {
      title: 'Active Users',
      value: stats.totalRedemptions,
      icon: TrendingUp,
      color: 'bg-yellow-500',
      href: '/dashboard/analytics',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Company User Dashboard - simplified view
  if (userRole === 'COMPANY') {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome to Kashif Admin Panel
            {companyName && <span className="font-semibold"> - {companyName}</span>}
          </p>
        </div>

        {/* Company User - Only Coupons Access */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard/coupons"
              className="block p-6 border-2 border-purple-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
            >
              <div className="flex items-center gap-4">
                <div className="bg-purple-500 p-3 rounded-lg">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Manage Coupons</h3>
                  <p className="text-sm text-gray-600 mt-1">Create and edit coupons for your company</p>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> As a company user, you can only manage coupons for your assigned company. 
            Contact an administrator if you need additional access.
          </p>
        </div>
      </div>
    );
  }

  // Admin Dashboard - full view
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to Kashif Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">{card.title}</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/users"
            className="block p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition"
          >
            <h3 className="font-semibold text-gray-900">Manage Users</h3>
            <p className="text-sm text-gray-600 mt-1">View and manage user accounts</p>
          </a>
          <a
            href="/dashboard/reports"
            className="block p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition"
          >
            <h3 className="font-semibold text-gray-900">Moderate Reports</h3>
            <p className="text-sm text-gray-600 mt-1">Review and update report statuses</p>
          </a>
          <a
            href="/dashboard/coupons"
            className="block p-4 border-2 border-gray-200 rounded-lg hover:border-primary transition"
          >
            <h3 className="font-semibold text-gray-900">Manage Coupons</h3>
            <p className="text-sm text-gray-600 mt-1">Create and edit coupons</p>
          </a>
        </div>
      </div>
    </div>
  );
}
