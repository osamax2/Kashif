'use client';

import { authAPI, couponsAPI, usersAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { ArrowLeft, Plus, Trash2, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface TeamMember {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  status: string;
  created_at: string;
}

interface Company {
  id: number;
  name: string;
  max_users: number;
}

export default function TeamPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });
  const [passwordError, setPasswordError] = useState('');

  // Password validation function - same as users page
  const validatePassword = (password: string): { valid: boolean; error: string } => {
    if (password.length < 8) {
      return { valid: false, error: isRTL ? 'يجب أن تكون كلمة المرور ٨ أحرف على الأقل' : 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: isRTL ? 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل' : 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: isRTL ? 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل' : 'Password must contain at least one lowercase letter' };
    }
    return { valid: true, error: '' };
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current user profile
      const profile = await authAPI.getProfile();
      
      if (!profile.company_id) {
        alert(isRTL ? 'لست مرتبطًا بأي شركة' : 'You are not assigned to any company');
        router.push('/dashboard');
        return;
      }
      
      // Get company info
      const companies = await couponsAPI.getCompanies();
      const currentCompany = companies.find((c: any) => c.id === profile.company_id);
      if (currentCompany) {
        setCompany(currentCompany);
      }
      
      // Get company members
      const membersData = await usersAPI.getCompanyMembers(profile.company_id);
      setMembers(Array.isArray(membersData) ? membersData : []);
      
      // Get user count
      const countData = await usersAPI.getCompanyUsersCount(profile.company_id);
      setUserCount(countData.user_count || 0);
      
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      alert(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert(isRTL ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address');
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error);
      return;
    }
    
    try {
      await usersAPI.addCompanyMember({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || undefined,
        max_users: company?.max_users || 5,
      });
      
      alert(isRTL ? 'تمت إضافة العضو بنجاح' : 'Member added successfully');
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Failed to add member:', error);
      const message = error.response?.data?.detail || (isRTL ? 'فشل في إضافة العضو' : 'Failed to add member');
      alert(message);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    
    try {
      await usersAPI.removeCompanyMember(selectedMember.id);
      alert(isRTL ? 'تم حذف العضو بنجاح' : 'Member removed successfully');
      setShowDeleteModal(false);
      setSelectedMember(null);
      loadData();
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      const message = error.response?.data?.detail || (isRTL ? 'فشل في حذف العضو' : 'Failed to remove member');
      alert(message);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
    });
    setPasswordError('');
  };

  const canAddMore = company ? userCount < company.max_users : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'فريق العمل' : 'Team Members'}
            </h1>
            <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : ''}`}>
              {company?.name} - {userCount}/{company?.max_users || 5} {isRTL ? 'مستخدمين' : 'users'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!canAddMore}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            canAddMore 
              ? 'bg-primary text-white hover:bg-blue-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          } ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-5 h-5" />
          {isRTL ? 'إضافة عضو' : 'Add Member'}
        </button>
      </div>

      {/* Limit Warning */}
      {!canAddMore && (
        <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 ${isRTL ? 'text-right' : ''}`}>
          <p className="text-yellow-800">
            {isRTL 
              ? `لقد وصلت إلى الحد الأقصى لعدد المستخدمين (${company?.max_users || 5}). اتصل بالمسؤول لزيادة الحد.`
              : `You have reached the maximum user limit (${company?.max_users || 5}). Contact admin to increase the limit.`
            }
          </p>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{isRTL ? 'لا يوجد أعضاء في الفريق' : 'No team members yet'}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الاسم' : 'Name'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'البريد الإلكتروني' : 'Email'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الحالة' : 'Status'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
                    <div className="font-medium text-gray-900">{member.full_name}</div>
                    {member.phone && (
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    )}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-gray-600 ${isRTL ? 'text-right' : ''}`}>
                    {member.email}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      member.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title={isRTL ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className={`flex items-center justify-between p-4 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-lg font-semibold">
                {isRTL ? 'إضافة عضو جديد' : 'Add New Member'}
              </h2>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'الاسم الكامل' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'البريد الإلكتروني' : 'Email'} *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  dir="ltr"
                  required
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'رقم الهاتف' : 'Phone'}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'كلمة المرور' : 'Password'} *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setPasswordError('');
                  }}
                  className={`w-full px-3 py-2 border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
                  dir="ltr"
                  required
                  minLength={8}
                />
                {/* Password requirements */}
                <div className={`mt-2 text-xs ${isRTL ? 'text-right' : ''}`}>
                  <p className={`${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ ٨ أحرف على الأقل' : '✓ At least 8 characters'}
                  </p>
                  <p className={`${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف كبير واحد على الأقل (A-Z)' : '✓ At least one uppercase letter (A-Z)'}
                  </p>
                  <p className={`${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف صغير واحد على الأقل (a-z)' : '✓ At least one lowercase letter (a-z)'}
                  </p>
                </div>
                {passwordError && (
                  <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{passwordError}</p>
                )}
              </div>
            </div>
            
            <div className={`flex gap-3 p-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleAddMember}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
              >
                {isRTL ? 'إضافة' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h2>
            <p className={`text-gray-600 mb-6 ${isRTL ? 'text-right' : ''}`}>
              {isRTL 
                ? `هل أنت متأكد من حذف "${selectedMember.full_name}"؟`
                : `Are you sure you want to remove "${selectedMember.full_name}"?`
              }
            </p>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setShowDeleteModal(false); setSelectedMember(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteMember}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                {isRTL ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
