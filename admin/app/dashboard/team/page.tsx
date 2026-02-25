'use client';

import { authAPI, couponsAPI, usersAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { ArrowLeft, Edit, Plus, RotateCcw, Trash2, Users, X } from 'lucide-react';
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
  const {t, isRTL, language} = useLanguage();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [deletedMembers, setDeletedMembers] = useState<TeamMember[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    status: 'ACTIVE',
  });

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
      return { valid: false, error: language === 'ar' ? 'يجب أن تكون كلمة المرور ٨ أحرف على الأقل' : language === 'ku' ? 'Şîfre divê herî kêm 8 tîp be' : 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: language === 'ar' ? 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل' : language === 'ku' ? 'Şîfre divê herî kêm yek tîpa mezin hebe' : 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: language === 'ar' ? 'يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل' : language === 'ku' ? 'Şîfre divê herî kêm yek tîpa biçûk hebe' : 'Password must contain at least one lowercase letter' };
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
        alert(language === 'ar' ? 'لست مرتبطًا بأي شركة' : language === 'ku' ? 'Tu bi tu şirkete ve ne girêdayî yî' : 'You are not assigned to any company');
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

  const loadDeletedMembers = async () => {
    try {
      setTrashLoading(true);
      // Get deleted users and filter by company
      const data = await usersAPI.getDeletedUsers();
      const profile = await authAPI.getProfile();
      // Filter deleted members that belong to the same company
      const companyDeletedMembers = Array.isArray(data)
          ? data.filter((u: any) => u.company_id === profile.company_id)
          : [];
      setDeletedMembers(companyDeletedMembers);
    } catch (error) {
      console.error('Failed to load deleted members:', error);
      setDeletedMembers([]);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleOpenTrash = async () => {
    setShowTrashModal(true);
    await loadDeletedMembers();
  };

  const handleRestoreMember = async (userId: number) => {
    try {
      await usersAPI.restoreUser(userId);
      setDeletedMembers(deletedMembers.filter(m => m.id !== userId));
      loadData();
    } catch (error) {
      console.error('Failed to restore member:', error);
      alert(language === 'ar' ? 'فشل في استعادة العضو' : language === 'ku' ? 'Vegera endam têk çû' : 'Failed to restore member');
    }
  };

  const handlePermanentDeleteMember = async (userId: number) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذا الإجراء.' : language === 'ku' ? 'Tu bi rastî dixwazî jêbirina herdemî bikî? Ev çalakî nayê vegerandin.' : 'Are you sure you want to permanently delete? This action cannot be undone.')) {
      return;
    }
    try {
      await usersAPI.permanentDeleteUser(userId);
      setDeletedMembers(deletedMembers.filter(m => m.id !== userId));
    } catch (error) {
      console.error('Failed to permanently delete member:', error);
      alert(language === 'ar' ? 'فشل في الحذف النهائي' : language === 'ku' ? 'Jêbirina herdemî têk çû' : 'Failed to permanently delete');
    }
  };

  const handleAddMember = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : language === 'ku' ? 'Ji kerema xwe hemû qada pêwîst dagir bike' : 'Please fill all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert(language === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح' : language === 'ku' ? 'Ji kerema xwe navnîşana e-nameya derbasdar binivîse' : 'Please enter a valid email address');
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

      alert(language === 'ar' ? 'تمت إضافة العضو بنجاح' : language === 'ku' ? 'Endam bi serkeftin hat zêdekirin' : 'Member added successfully');
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Failed to add member:', error);
      const message = error.response?.data?.detail || (language === 'ar' ? 'فشل في إضافة العضو' : language === 'ku' ? 'Zêdekirina endam têk çû' : 'Failed to add member');
      alert(message);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      await usersAPI.removeCompanyMember(selectedMember.id);
      alert(language === 'ar' ? 'تم حذف العضو بنجاح' : language === 'ku' ? 'Endam bi serkeftin hat jêbirin' : 'Member removed successfully');
      setShowDeleteModal(false);
      setSelectedMember(null);
      loadData();
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      const message = error.response?.data?.detail || (language === 'ar' ? 'فشل في حذف العضو' : language === 'ku' ? 'Jêbirina endam têk çû' : 'Failed to remove member');
      alert(message);
    }
  };

  const openEditModal = (member: TeamMember) => {
    setSelectedMember(member);
    setEditFormData({
      full_name: member.full_name,
      phone: member.phone || '',
      status: member.status,
    });
    setShowEditModal(true);
  };

  const handleEditMember = async () => {
    if (!selectedMember) return;

    if (!editFormData.full_name) {
      alert(language === 'ar' ? 'يرجى إدخال الاسم الكامل' : language === 'ku' ? 'Ji kerema xwe navê tevahî binivîse' : 'Please enter full name');
      return;
    }

    try {
      await usersAPI.updateUser(selectedMember.id, {
        full_name: editFormData.full_name,
        phone: editFormData.phone || undefined,
        status: editFormData.status,
      });
      alert(language === 'ar' ? 'تم تحديث العضو بنجاح' : language === 'ku' ? 'Endam bi serkeftin hat nûvekirin' : 'Member updated successfully');
      setShowEditModal(false);
      setSelectedMember(null);
      loadData();
    } catch (error: any) {
      console.error('Failed to update member:', error);
      const message = error.response?.data?.detail || (language === 'ar' ? 'فشل في تحديث العضو' : language === 'ku' ? 'Nûvekirina endam têk çû' : 'Failed to update member');
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
                {language === 'ar' ? 'فريق العمل' : language === 'ku' ? 'Endamên Tîmê' : 'Team Members'}
              </h1>
              <p className={`text-gray-600 mt-1 ${isRTL ? 'text-right' : ''}`}>
                {company?.name} - {userCount}/{company?.max_users || 5} {language === 'ar' ? 'مستخدمين' : language === 'ku' ? 'Bikarhêner' : 'users'}
              </p>
            </div>
          </div>

          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
                onClick={handleOpenTrash}
                className={`flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Trash2 className="w-5 h-5" />
              {language === 'ar' ? 'المحذوفات' : language === 'ku' ? 'Jêbirî' : 'Trash'}
            </button>
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
              {language === 'ar' ? 'إضافة عضو' : language === 'ku' ? 'Endam zêde bike' : 'Add Member'}
            </button>
          </div>
        </div>

        {/* Limit Warning */}
        {!canAddMore && (
            <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 ${isRTL ? 'text-right' : ''}`}>
              <p className="text-yellow-800">
                {language === 'ar' ? `لقد وصلت إلى الحد الأقصى لعدد المستخدمين (${company?.max_users || 5}). اتصل بالمسؤول لزيادة الحد.` : language === 'ku' ? `Te gihîştî asta herî zêde ya bikarhêneran (${company?.max_users || 5}). Ji bo zêdekirinê bi rêveber re têkilî dayne.` : `You have reached the maximum user limit (${company?.max_users || 5}). Contact admin to increase the limit.`
                }
              </p>
            </div>
        )}

        {/* Members List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {members.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{language === 'ar' ? 'لا يوجد أعضاء في الفريق' : language === 'ku' ? 'Hêj endamek di tîmê de tune' : 'No team members yet'}</p>
              </div>
          ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                <tr>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'الاسم' : language === 'ku' ? 'Nav' : 'Name'}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'البريد الإلكتروني' : language === 'ku' ? 'E-name' : 'Email'}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'الحالة' : language === 'ku' ? 'Rewş' : 'Status'}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {language === 'ar' ? 'الإجراءات' : language === 'ku' ? 'Çalakî' : 'Actions'}
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
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                          <button
                              onClick={() => openEditModal(member)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title={language === 'ar' ? 'تعديل' : language === 'ku' ? 'Biguherîne' : 'Edit'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                              onClick={() => {
                                setSelectedMember(member);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title={language === 'ar' ? 'حذف' : language === 'ku' ? 'Jê bibe' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                    {language === 'ar' ? 'إضافة عضو جديد' : language === 'ku' ? 'Endamek Nû Zêde Bike' : 'Add New Member'}
                  </h2>
                  <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'الاسم الكامل' : language === 'ku' ? 'Navê Tevahî' : 'Full Name'} *
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
                      {language === 'ar' ? 'البريد الإلكتروني' : language === 'ku' ? 'E-name' : 'Email'} *
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
                      {language === 'ar' ? 'رقم الهاتف' : language === 'ku' ? 'Telefon' : 'Phone'}
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
                      {language === 'ar' ? 'كلمة المرور' : language === 'ku' ? 'Şîfre' : 'Password'} *
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
                        {language === 'ar' ? '✓ ٨ أحرف على الأقل' : language === 'ku' ? '✓ Herî kêm 8 tîp' : '✓ At least 8 characters'}
                      </p>
                      <p className={`${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                        {language === 'ar' ? '✓ حرف كبير واحد على الأقل (A-Z)' : language === 'ku' ? '✓ Herî kêm yek tîpa mezin (A-Z)' : '✓ At least one uppercase letter (A-Z)'}
                      </p>
                      <p className={`${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                        {language === 'ar' ? '✓ حرف صغير واحد على الأقل (a-z)' : language === 'ku' ? '✓ Herî kêm yek tîpa biçûk (a-z)' : '✓ At least one lowercase letter (a-z)'}
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
                    {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                  </button>
                  <button
                      onClick={handleAddMember}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {language === 'ar' ? 'إضافة' : language === 'ku' ? 'Zede bike' : 'Add'}
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
                  {language === 'ar' ? 'تأكيد الحذف' : language === 'ku' ? 'Piştrastkirina Jêbirinê' : 'Confirm Delete'}
                </h2>
                <p className={`text-gray-600 mb-6 ${isRTL ? 'text-right' : ''}`}>
                  {language === 'ar' ? `هل أنت متأكد من حذف "${selectedMember.full_name}"؟` : language === 'ku' ? `Tu bi rastî dixwazî "${selectedMember.full_name}" jê bibî?` : `Are you sure you want to remove "${selectedMember.full_name}"?`
                  }
                </p>
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                      onClick={() => { setShowDeleteModal(false); setSelectedMember(null); }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                  </button>
                  <button
                      onClick={handleDeleteMember}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    {language === 'ar' ? 'حذف' : language === 'ku' ? 'Jê bibe' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Edit Member Modal */}
        {showEditModal && selectedMember && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className={`flex items-center justify-between p-4 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h2 className="text-lg font-semibold">
                    {language === 'ar' ? 'تعديل العضو' : language === 'ku' ? 'Endam Biguherîne' : 'Edit Member'}
                  </h2>
                  <button onClick={() => { setShowEditModal(false); setSelectedMember(null); }} className="text-gray-500 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'الاسم الكامل' : language === 'ku' ? 'Navê Tevahî' : 'Full Name'} *
                    </label>
                    <input
                        type="text"
                        value={editFormData.full_name}
                        onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                        required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'البريد الإلكتروني' : language === 'ku' ? 'E-name' : 'Email'}
                    </label>
                    <input
                        type="email"
                        value={selectedMember.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500"
                        dir="ltr"
                    />
                    <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'لا يمكن تغيير البريد الإلكتروني' : language === 'ku' ? 'E-name nayê guhertin' : 'Email cannot be changed'}
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'رقم الهاتف' : language === 'ku' ? 'Telefon' : 'Phone'}
                    </label>
                    <input
                        type="tel"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        dir="ltr"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'الحالة' : language === 'ku' ? 'Rewş' : 'Status'}
                    </label>
                    <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                    >
                      <option value="ACTIVE">{language === 'ar' ? 'نشط' : language === 'ku' ? 'Çalak' : 'Active'}</option>
                      <option value="INACTIVE">{language === 'ar' ? 'غير نشط' : language === 'ku' ? 'Neçalak' : 'Inactive'}</option>
                    </select>
                  </div>
                </div>

                <div className={`flex gap-3 p-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                      onClick={() => { setShowEditModal(false); setSelectedMember(null); }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                  </button>
                  <button
                      onClick={handleEditMember}
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {language === 'ar' ? 'حفظ' : language === 'ku' ? 'Tomar bike' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Trash Modal */}
        {showTrashModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`flex justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h2 className={`text-xl font-bold text-gray-900 ${isRTL ? 'text-right' : ''}`}>
                    {language === 'ar' ? 'الأعضاء المحذوفين' : language === 'ku' ? 'Endamên Hatine Jêbirin' : 'Deleted Members'}
                  </h2>
                  <button
                      onClick={() => setShowTrashModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {trashLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      </div>
                  ) : deletedMembers.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>{language === 'ar' ? 'لا يوجد أعضاء محذوفين' : language === 'ku' ? 'Tu endamê hatî jêbirin tune' : 'No deleted members'}</p>
                      </div>
                  ) : (
                      <div className="space-y-3">
                        {deletedMembers.map((member) => (
                            <div key={member.id} className="border rounded-lg p-4 bg-gray-50">
                              <div className={`flex justify-between items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div>
                                  <h3 className={`font-semibold text-gray-900 ${isRTL ? 'text-right' : ''}`}>{member.full_name}</h3>
                                  <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : ''}`}>{member.email}</p>
                                  {member.phone && (
                                      <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : ''}`}>{member.phone}</p>
                                  )}
                                </div>
                                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <button
                                      onClick={() => handleRestoreMember(member.id)}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                    {language === 'ar' ? 'استعادة' : language === 'ku' ? 'Vegerin' : 'Restore'}
                                  </button>
                                  <button
                                      onClick={() => handlePermanentDeleteMember(member.id)}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {language === 'ar' ? 'حذف نهائي' : language === 'ku' ? 'Herdemî jê bibe' : 'Delete Forever'}
                                  </button>
                                </div>
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
