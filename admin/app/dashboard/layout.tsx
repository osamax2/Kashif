'use client';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import { authAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import {
    Activity,
    BarChart3,
    Bell,
    Building2,
    FileText,
    Gift,
    Heart,
    LayoutDashboard,
    LogOut,
    Map,
    Menu,
    MessageSquareText,
    QrCode,
    Shield,
    Users,
    UsersRound,
    X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, isRTL } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/login');
      return;
    }

    authAPI.getProfile()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('admin_token');
        router.push('/login');
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('user_profile');
    router.push('/login');
  };

  // Grouped navigation for ADMIN
  const adminNavigation = [
    {
      category: null,
      items: [
        { name: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      category: isRTL ? 'البلاغات والخريطة' : 'Reports & Map',
      items: [
        { name: t.nav.reports, href: '/dashboard/reports', icon: FileText },
        { name: isRTL ? 'الخريطة' : 'Map', href: '/dashboard/map', icon: Map },
        { name: isRTL ? 'التبرعات' : 'Donations', href: '/dashboard/donations', icon: Heart },
      ],
    },
    {
      category: isRTL ? 'الأعمال' : 'Business',
      items: [
        { name: t.nav.coupons, href: '/dashboard/coupons', icon: Gift },
        { name: isRTL ? 'الشركات' : 'Companies', href: '/dashboard/companies', icon: Building2 },
      ],
    },
    {
      category: isRTL ? 'المجتمع' : 'Community',
      items: [
        { name: t.nav.users, href: '/dashboard/users', icon: Users },
        { name: t.nav.notifications, href: '/dashboard/notifications', icon: Bell },
        { name: isRTL ? 'الملاحظات' : 'Feedback', href: '/dashboard/feedback', icon: MessageSquareText },
      ],
    },
    {
      category: isRTL ? 'النظام' : 'System',
      items: [
        { name: t.nav.analytics, href: '/dashboard/analytics', icon: BarChart3 },
        { name: isRTL ? 'مراقبة النظام' : 'Monitoring', href: '/dashboard/monitoring', icon: Activity },
        { name: isRTL ? 'سجل التدقيق' : 'Audit Log', href: '/dashboard/audit-log', icon: Shield },
      ],
    },
  ];

  // Limited navigation for COMPANY role
  const companyNavigation = [
    {
      category: null,
      items: [
        { name: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
        { name: t.nav.coupons, href: '/dashboard/coupons', icon: Gift },
        { name: isRTL ? 'مسح كوبون' : 'Scan Coupon', href: '/dashboard/scan', icon: QrCode },
        { name: isRTL ? 'فريق العمل' : 'Team', href: '/dashboard/team', icon: UsersRound },
        { name: t.nav.analytics, href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
  ];

  // Navigation for GOVERNMENT role - Reports and Map only
  const governmentNavigation = [
    {
      category: null,
      items: [
        { name: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
        { name: t.nav.reports, href: '/dashboard/reports', icon: FileText },
        { name: isRTL ? 'الخريطة' : 'Map', href: '/dashboard/map', icon: Map },
      ],
    },
  ];

  // Navigation for MODERATOR role
  const moderatorNavigation = [
    {
      category: null,
      items: [
        { name: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      category: isRTL ? 'البلاغات' : 'Reports',
      items: [
        { name: t.nav.users, href: '/dashboard/users', icon: Users },
        { name: t.nav.reports, href: '/dashboard/reports', icon: FileText },
        { name: isRTL ? 'الخريطة' : 'Map', href: '/dashboard/map', icon: Map },
      ],
    },
    {
      category: isRTL ? 'النظام' : 'System',
      items: [
        { name: t.nav.analytics, href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
  ];

  // Navigation for VIEWER role
  const viewerNavigation = [
    {
      category: null,
      items: [
        { name: t.nav.dashboard, href: '/dashboard', icon: LayoutDashboard },
        { name: t.nav.users, href: '/dashboard/users', icon: Users },
        { name: t.nav.reports, href: '/dashboard/reports', icon: FileText },
        { name: t.nav.analytics, href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
  ];

  // Allowed paths for COMPANY users
  const companyAllowedPaths = ['/dashboard', '/dashboard/coupons', '/dashboard/scan', '/dashboard/team', '/dashboard/analytics'];

  // Allowed paths for GOVERNMENT users
  const governmentAllowedPaths = ['/dashboard', '/dashboard/reports', '/dashboard/map'];

  // Allowed paths for MODERATOR users
  const moderatorAllowedPaths = ['/dashboard', '/dashboard/users', '/dashboard/reports', '/dashboard/map', '/dashboard/analytics'];

  // Allowed paths for VIEWER users
  const viewerAllowedPaths = ['/dashboard', '/dashboard/users', '/dashboard/reports', '/dashboard/analytics'];

  // Select navigation based on user role
  const getNavigation = () => {
    const role = user?.role?.toUpperCase();
    if (role === 'COMPANY') return companyNavigation;
    if (role === 'GOVERNMENT') return governmentNavigation;
    if (role === 'MODERATOR') return moderatorNavigation;
    if (role === 'VIEWER') return viewerNavigation;
    return adminNavigation;
  };
  const navigation = getNavigation();

  // Route protection for restricted roles
  useEffect(() => {
    const role = user?.role?.toUpperCase();
    if (role === 'COMPANY' && !companyAllowedPaths.includes(pathname)) {
      router.push('/dashboard/coupons');
    } else if (role === 'GOVERNMENT' && !governmentAllowedPaths.includes(pathname)) {
      router.push('/dashboard/reports');
    } else if (role === 'MODERATOR' && !moderatorAllowedPaths.includes(pathname)) {
      router.push('/dashboard');
    } else if (role === 'VIEWER' && !viewerAllowedPaths.includes(pathname)) {
      router.push('/dashboard');
    }
  }, [user, pathname, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'font-tajawal' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-[999] w-64 bg-primary transform transition-transform duration-300 ease-in-out ${
          sidebarOpen 
            ? 'translate-x-0' 
            : isRTL ? 'translate-x-full' : '-translate-x-full'
        } ${isRTL ? 'lg:translate-x-0' : 'lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-blue-800">
            <h1 className="text-2xl font-bold text-white">Kashif Admin</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white hover:text-yellow"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Language Switcher */}
          <div className="px-4 pt-4">
            <LanguageSwitcher className="w-full justify-center" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((group, groupIdx) => (
              <div key={group.category || 'main'}>
                {group.category && (
                  <div className={`${groupIdx > 0 ? 'mt-4' : 'mt-2'} mb-1 px-3`}>
                    <p className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">
                      {group.category}
                    </p>
                  </div>
                )}
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                        isActive
                          ? 'bg-yellow text-primary font-semibold'
                          : 'text-white hover:bg-blue-800'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-blue-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow flex items-center justify-center text-primary font-bold">
                {user.full_name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user.full_name}</p>
                <p className="text-blue-200 text-sm truncate">{user.email}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                  user.role === 'ADMIN' ? 'bg-purple-500 text-white' : 
                  user.role === 'MODERATOR' ? 'bg-amber-500 text-white' :
                  user.role === 'VIEWER' ? 'bg-gray-400 text-white' :
                  user.role === 'GOVERNMENT' ? 'bg-blue-600 text-white' :
                  user.role === 'COMPANY' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {user.role === 'ADMIN' ? t.users.roles.admin : 
                   user.role === 'MODERATOR' ? (isRTL ? 'مشرف' : 'Moderator') :
                   user.role === 'VIEWER' ? (isRTL ? 'مشاهد' : 'Viewer') :
                   user.role === 'GOVERNMENT' ? t.users.roles.government :
                   user.role === 'COMPANY' ? t.users.roles.company : t.users.roles.user}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              {t.auth.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className={`lg:hidden fixed top-4 ${isRTL ? 'right-4' : 'left-4'} z-[998] p-2 bg-primary text-white rounded-lg`}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Main content */}
      <main className={isRTL ? 'lg:pr-64' : 'lg:pl-64'}>
        <div className="p-4 pt-16 sm:p-6 sm:pt-6 lg:p-8 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[998]"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
