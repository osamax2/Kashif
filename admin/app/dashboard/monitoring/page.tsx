'use client';

import { useLanguage } from '@/lib/i18n';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  MessageSquare,
  RefreshCw,
  Server,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ServiceCheck {
  status: string;
  response_ms?: number;
  error?: string;
}

interface ServiceHealth {
  status: string;
  service: string;
  checks?: {
    database?: ServiceCheck;
    rabbitmq?: ServiceCheck;
  };
  response_ms?: number;
  error?: string;
}

interface DockerStatus {
  name: string;
  status: string;
  health: string;
}

const SERVICES = [
  { key: 'auth', label: 'Auth Service', labelAr: 'خدمة المصادقة' },
  { key: 'reporting', label: 'Reporting Service', labelAr: 'خدمة البلاغات' },
  { key: 'gamification', label: 'Gamification Service', labelAr: 'خدمة التلعيب' },
  { key: 'coupons', label: 'Coupons Service', labelAr: 'خدمة القسائم' },
  { key: 'notification', label: 'Notification Service', labelAr: 'خدمة الإشعارات' },
];

export default function MonitoringPage() {
  const { isRTL } = useLanguage();
  const [healthData, setHealthData] = useState<Record<string, ServiceHealth>>({});
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    const results: Record<string, ServiceHealth> = {};

    for (const svc of SERVICES) {
      try {
        const response = await fetch(`/api/monitoring/${svc.key}`);
        if (response.ok) {
          results[svc.key] = await response.json();
        } else {
          results[svc.key] = {
            status: 'unhealthy',
            service: svc.key,
            error: `HTTP ${response.status}`,
          };
        }
      } catch (err: any) {
        results[svc.key] = {
          status: 'unreachable',
          service: svc.key,
          error: err.message || 'Connection failed',
        };
      }
    }

    setHealthData(results);
    setLastCheck(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'unhealthy': return 'text-red-500';
      case 'unreachable': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-50 border-green-200';
      case 'degraded': return 'bg-yellow-50 border-yellow-200';
      case 'unhealthy': return 'bg-red-50 border-red-200';
      case 'unreachable': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'unhealthy': return <XCircle className="w-6 h-6 text-red-500" />;
      default: return <XCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const healthyCount = Object.values(healthData).filter(h => h.status === 'healthy').length;
  const totalCount = SERVICES.length;
  const overallStatus = healthyCount === totalCount ? 'healthy' : healthyCount > 0 ? 'degraded' : 'unhealthy';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7" />
            {isRTL ? 'مراقبة النظام' : 'System Monitoring'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isRTL ? 'حالة جميع الخدمات الخلفية' : 'Health status of all backend microservices'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            {isRTL ? 'تحديث تلقائي' : 'Auto-refresh (30s)'}
          </label>
          <button
            onClick={fetchHealthData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`rounded-xl border-2 p-6 ${getStatusBg(overallStatus)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              overallStatus === 'healthy' ? 'bg-green-100' :
              overallStatus === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {overallStatus === 'healthy' ? (
                <CheckCircle className="w-10 h-10 text-green-500" />
              ) : overallStatus === 'degraded' ? (
                <AlertTriangle className="w-10 h-10 text-yellow-500" />
              ) : (
                <XCircle className="w-10 h-10 text-red-500" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {overallStatus === 'healthy'
                  ? (isRTL ? 'جميع الخدمات تعمل' : 'All Systems Operational')
                  : overallStatus === 'degraded'
                  ? (isRTL ? 'بعض الخدمات متأثرة' : 'Some Services Degraded')
                  : (isRTL ? 'خدمات معطلة' : 'Services Down')}
              </h2>
              <p className="text-sm text-gray-600">
                {healthyCount}/{totalCount} {isRTL ? 'خدمات تعمل بشكل صحيح' : 'services healthy'}
                {lastCheck && ` — ${isRTL ? 'آخر فحص' : 'Last check'}: ${lastCheck}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map((svc) => {
          const health = healthData[svc.key];
          const status = health?.status || 'unknown';

          return (
            <div
              key={svc.key}
              className={`rounded-xl border p-5 ${getStatusBg(status)} transition-all hover:shadow-md`}
            >
              {/* Service Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Server className={`w-5 h-5 ${getStatusColor(status)}`} />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {isRTL ? svc.labelAr : svc.label}
                    </h3>
                    <span className={`text-xs font-medium uppercase ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                </div>
                {getStatusIcon(status)}
              </div>

              {/* Checks Detail */}
              {health?.checks && (
                <div className="space-y-2 border-t pt-3">
                  {/* Database */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-gray-400" />
                      <span>{isRTL ? 'قاعدة البيانات' : 'Database'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {health.checks.database?.status === 'healthy' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {health.checks.database?.response_ms && (
                        <span className="text-xs text-gray-500">
                          {health.checks.database.response_ms}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RabbitMQ */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <span>RabbitMQ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {health.checks.rabbitmq?.status === 'healthy' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {health.checks.rabbitmq?.response_ms && (
                        <span className="text-xs text-gray-500">
                          {health.checks.rabbitmq.response_ms}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {health?.error && (
                <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700 truncate">
                  {health.error}
                </div>
              )}

              {/* Response Time */}
              {health?.checks && (
                <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {isRTL ? 'وقت الاستجابة' : 'Response time'}:{' '}
                  {health.checks.database?.response_ms || '-'}ms
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Docker Container Health */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Server className="w-5 h-5" />
          {isRTL ? 'معلومات إضافية' : 'Monitoring Info'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {isRTL ? 'التنبيهات عبر البريد' : 'Email Alerts'}
            </h4>
            <p>{isRTL 
              ? 'يتم إرسال تنبيهات تلقائية عند تعطل أي خدمة أو استعادتها' 
              : 'Automatic email alerts are sent when services go down or recover'}</p>
            <p className="text-xs text-gray-400 mt-1">→ admin@kashif.com</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {isRTL ? 'فحص Docker' : 'Docker Healthchecks'}
            </h4>
            <p>{isRTL
              ? 'جميع الحاويات مراقبة بفحوصات صحية كل 30 ثانية'
              : 'All containers monitored with healthchecks every 30 seconds'}</p>
            <p className="text-xs text-gray-400 mt-1">interval=30s, retries=3</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {isRTL ? 'JSON سجلات منظمة' : 'Structured JSON Logs'}
            </h4>
            <p>{isRTL
              ? 'جميع الخدمات تستخدم سجلات JSON مع معرف الطلب للتتبع'
              : 'All services use JSON logging with request-ID tracing'}</p>
            <p className="text-xs text-gray-400 mt-1">max-size=10m, max-file=5</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              {isRTL ? 'CI/CD' : 'CI/CD Pipeline'}
            </h4>
            <p>{isRTL
              ? 'اختبارات تلقائية ونشر عند الدفع إلى الفرع الرئيسي'
              : 'Automated tests and deployment on push to main branch'}</p>
            <p className="text-xs text-gray-400 mt-1">GitHub Actions → SSH Deploy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
