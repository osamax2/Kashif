'use client';

import { analyticsAPI, couponsAPI, reportsAPI } from '@/lib/api';
import { LeaderboardEntry } from '@/lib/types';
import { TrendingUp, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AnalyticsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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
      const [leaderboardData, reports, coupons, users] = await Promise.all([
        analyticsAPI.getLeaderboard(100),
        reportsAPI.getReports({ limit: 1000 }),
        couponsAPI.getRedemptions(),
        import('@/lib/api').then(m => m.usersAPI.getUsers(0, 1000).catch(() => [])),
      ]);

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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Platform statistics and insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Reports</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalReports}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Resolved Reports</h3>
          <p className="text-3xl font-bold text-green-600">{stats.resolvedReports}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Resolution Rate</h3>
          <p className="text-3xl font-bold text-blue-600">
            {stats.totalReports > 0
              ? Math.round((stats.resolvedReports / stats.totalReports) * 100)
              : 0}
            %
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Redemptions</h3>
          <p className="text-3xl font-bold text-yellow">{stats.totalRedemptions}</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-yellow rounded-lg flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Top Users Leaderboard</h2>
            <p className="text-sm text-gray-600">Users ranked by total points</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.map((entry, index) => (
                <tr key={entry.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                      {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                      {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                      <span className="font-semibold text-gray-900">#{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                        {entry.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{entry.full_name || `User ${entry.user_id}`}</p>
                        <p className="text-sm text-gray-500">ID: {entry.user_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-yellow font-bold text-lg">
                      {entry.total_points.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No leaderboard data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
