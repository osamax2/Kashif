'use client';

import { donationsAPI, reportsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Donation, Report } from '@/lib/types';
import { DollarSign, Heart, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DonationsPage() {
  const {isRTL, language} = useLanguage();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterReportId, setFilterReportId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const totalDonated = donations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const uniqueDonors = new Set(donations.map(d => d.user_id)).size;
  const uniqueReports = new Set(donations.map(d => d.report_id)).size;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [donationsData, reportsData] = await Promise.all([
        donationsAPI.getDonations({ limit: 500 }),
        reportsAPI.getReports({ limit: 500 }),
      ]);
      setDonations(donationsData);
      setReports(reportsData.reports || reportsData);
    } catch (error) {
      console.error('Error loading donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDonations = donations.filter(d => {
    if (filterReportId && d.report_id !== parseInt(filterReportId)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
          (d.donor_name || '').toLowerCase().includes(q) ||
          (d.user_name || '').toLowerCase().includes(q) ||
          (d.user_email || '').toLowerCase().includes(q) ||
          (d.report_title || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(isRTL ? 'ar' : 'en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      paypal: 'PayPal',
      visa: 'Visa',
      mastercard: 'Mastercard',
      shamcash: 'ShamCash',
    };
    return labels[method] || method;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
    };
    const labelAr: Record<string, string> = {
      pending: 'معلق',
      completed: 'مكتمل',
      failed: 'فشل',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {isRTL ? (labelAr[status] || status) : status}
      </span>
    );
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
    );
  }

  return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="h-8 w-8 text-pink-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              {language === 'ar' ? 'التبرعات' : language === 'ku' ? 'Alîkariya Darbendî' : 'Donations'}
            </h1>
          </div>
          <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
            {language === 'ar' ? 'تحديث' : language === 'ku' ? 'Nûvekirin' : 'Refresh'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-pink-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-pink-600" />
              </div>
              <span className="text-gray-500 text-sm">{language === 'ar' ? 'إجمالي التبرعات' : language === 'ku' ? 'Gşitî Alîkariyên Darbendî' : 'Total Donated'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${totalDonated.toFixed(2)}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Heart className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-gray-500 text-sm">{language === 'ar' ? 'عدد المتبرعين' : language === 'ku' ? 'Hejmara Kesên Alîkar' : 'Unique Donors'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{uniqueDonors}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Heart className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-gray-500 text-sm">{language === 'ar' ? 'بلاغات حصلت على تبرعات' : language === 'ku' ? 'Ragihandinên ku alîkariyê wergirtin' : 'Reports with Donations'}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{uniqueReports}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
            <input
                type="text"
                placeholder={language === 'ar' ? 'بحث بالاسم أو البريد أو عنوان البلاغ...' : language === 'ku' ? 'Li gorî nav, e-name an sernavê ragihandinê bigere...' : 'Search by name, email, or report title...'}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
              className="px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              value={filterReportId}
              onChange={(e) => setFilterReportId(e.target.value)}
          >
            <option value="">{language === 'ar' ? 'كل البلاغات' : language === 'ku' ? 'Hemû rapor' : 'All Reports'}</option>
            {reports.map(r => (
                <option key={r.id} value={r.id}>
                  #{r.id} - {r.title?.substring(0, 40) || (language === 'ar' ? 'بلاغ' : language === 'ku' ? 'Rapor' : 'Report')}
                </option>
            ))}
          </select>
        </div>

        {/* Donations Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">#</th>
                <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'المتبرع' : language === 'ku' ? 'Kesê Alîkar' : 'Donor'}</th>
                <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'البلاغ' : language === 'ku' ? 'Rapor' : 'Report'}</th>
                <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'المبلغ' : language === 'ku' ? 'Bihayê' : 'Amount'}</th>
                <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'طريقة الدفع' : language === 'ku' ? 'Rêbaza Dayînê' : 'Method'}</th>
                <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'الحالة' : language === 'ku' ? 'Rewş' : 'Status'}</th>
                <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'الرسالة' : language === 'ku' ? 'Peyam' : 'Message'}</th>
                <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'التاريخ' : language === 'ku' ? 'Dîrok' : 'Date'}</th>
              </tr>
              </thead>
              <tbody>
              {filteredDonations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-lg">{language === 'ar' ? 'لا توجد تبرعات بعد' : language === 'ku' ? 'Hê alîkariya darbendî tune ne' : 'No donations yet'}</p>
                      <p className="text-sm mt-1">{language === 'ar' ? 'ستظهر التبرعات هنا عندما يبدأ المستخدمون بالتبرع' : language === 'ku' ? 'Dema ku bikarhêneran dest bi alîkariyê bikin, ew li vir xuya dibe' : 'Donations will appear here when users start donating'}</p>
                    </td>
                  </tr>
              ) : (
                  filteredDonations.map((donation, index) => (
                      <tr key={donation.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-gray-500 text-sm">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-gray-900 text-sm font-medium">{donation.donor_name || donation.user_name || '-'}</p>
                            <p className="text-gray-400 text-xs">{donation.user_email || '-'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-900 text-sm">#{donation.report_id}</p>
                          <p className="text-gray-400 text-xs truncate max-w-[200px]">{donation.report_title || '-'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-pink-600 font-bold">${Number(donation.amount || 0).toFixed(2)}</span>
                          <span className="text-gray-400 text-xs ml-1">{donation.currency}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 text-sm">
                          {getPaymentMethodLabel(donation.payment_method)}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(donation.payment_status)}</td>
                        <td className="px-4 py-3 text-gray-500 text-sm truncate max-w-[150px]">
                          {donation.donor_message || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {formatDate(donation.created_at)}
                        </td>
                      </tr>
                  ))
              )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reports Repair Cost Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            {language === 'ar' ? 'تكلفة الإصلاح للبلاغات' : language === 'ku' ? 'Nirxê çêkirina raporên' : 'Reports Repair Cost'}
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">#</th>
                  <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'البلاغ' : language === 'ku' ? 'Rapor' : 'Report'}</th>
                  <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'تكلفة الإصلاح' : language === 'ku' ? 'Nirxê çêkirina' : 'Repair Cost'}</th>
                  <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'إجمالي التبرعات' : language === 'ku' ? 'Giştî Alîkariyên Darbendî' : 'Total Donated'}</th>
                  <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'التقدم' : language === 'ku' ? 'Pêşveçûn' : 'Progress'}</th>
                  <th className="px-4 py-3 text-gray-600 text-sm font-medium text-start">{language === 'ar' ? 'إجراء' : language === 'ku' ? 'Çalakî' : 'Action'}</th>
                </tr>
                </thead>
                <tbody>
                {reports.map((report) => (
                    <RepairCostRow key={report.id} report={report} isRTL={isRTL} language={language} onUpdate={loadData} />
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
  );
}

function RepairCostRow({ report, isRTL, language, onUpdate }: { report: Report; isRTL: boolean; language: string; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [cost, setCost] = useState(report.repair_cost?.toString() || '0');
  const [saving, setSaving] = useState(false);

  const repairCost = Number(report.repair_cost || 0);
  const totalDonated = Number(report.total_donated || 0);
  const progress = repairCost > 0 ? Math.min((totalDonated / repairCost) * 100, 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await donationsAPI.updateRepairCost(report.id, parseFloat(cost) || 0);
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating repair cost:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
        <td className="px-4 py-3 text-gray-500 text-sm">{report.id}</td>
        <td className="px-4 py-3">
          <p className="text-gray-900 text-sm truncate max-w-[250px]">{report.title || (language === 'ar' ? 'بلاغ' : language === 'ku' ? 'Rapor' : 'Report')}</p>
        </td>
        <td className="px-4 py-3">
          {editing ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">$</span>
                <input
                    type="number"
                    className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-gray-900 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    min="0"
                    step="0.01"
                />
              </div>
          ) : (
              <span className="text-gray-900 font-medium">${repairCost.toFixed(2)}</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className="text-green-400 font-medium">${totalDonated.toFixed(2)}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: progress >= 100 ? '#4CD964' : progress > 50 ? '#FFD166' : '#E91E63',
                  }}
              />
            </div>
            <span className="text-gray-500 text-xs">{progress.toFixed(0)}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          {editing ? (
              <div className="flex items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition disabled:opacity-50"
                >
                  {saving ? '...' : (language === 'ar' ? 'حفظ' : language === 'ku' ? 'Tomar bike' : 'Save')}
                </button>
                <button
                    onClick={() => { setEditing(false); setCost(repairCost.toString()); }}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm hover:bg-gray-200 transition"
                >
                  {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                </button>
              </div>
          ) : (
              <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded text-sm hover:bg-pink-500/30 transition"
              >
                {language === 'ar' ? 'تعديل التكلفة' : language === 'ku' ? 'Mesref biguherîne' : 'Edit Cost'}
              </button>
          )}
        </td>
      </tr>
  );
}
