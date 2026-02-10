'use client';

import { couponsAPI, usersAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { User } from '@/lib/types';
import { Award, Building2, KeyRound, Landmark, RotateCcw, Search, Shield, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function UsersPage() {
  const { t, isRTL } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [showCreateCompanyUserModal, setShowCreateCompanyUserModal] = useState(false);
  const [showCreateGovernmentUserModal, setShowCreateGovernmentUserModal] = useState(false);
  const [showCreateNormalUserModal, setShowCreateNormalUserModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showCreateAdminUserModal, setShowCreateAdminUserModal] = useState(false);
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    role: 'USER',
    status: 'ACTIVE',
  });
  const [companyUserForm, setCompanyUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    company_id: '',
    phone_number: '',
  });
  const [governmentUserForm, setGovernmentUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    city: '',
    district: '',
    job_description: '',
  });
  const [normalUserForm, setNormalUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });
  const [normalUserPasswordError, setNormalUserPasswordError] = useState('');
  const [adminUserForm, setAdminUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });
  const [adminUserPasswordError, setAdminUserPasswordError] = useState('');
  const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetPasswordError, setResetPasswordError] = useState('');

  // Field-level validation errors for all forms
  const [companyFormErrors, setCompanyFormErrors] = useState<Record<string, string>>({});
  const [governmentFormErrors, setGovernmentFormErrors] = useState<Record<string, string>>({});
  const [normalFormErrors, setNormalFormErrors] = useState<Record<string, string>>({});
  const [adminFormErrors, setAdminFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUsers();
    loadDeletedUsers();
    loadCompanies();
  }, []);

  useEffect(() => {
    const sourceUsers = activeTab === 'active' ? users : deletedUsers;
    let filtered = sourceUsers.filter(
      (user) =>
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );
    
    // Apply role filter
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }
    
    // Apply status filter (only for active tab)
    if (statusFilter !== 'ALL' && activeTab === 'active') {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }
    
    setFilteredUsers(filtered);
  }, [search, users, deletedUsers, roleFilter, statusFilter, activeTab]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersAPI.getUsers(0, 1000);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedUsers = async () => {
    try {
      const data = await usersAPI.getDeletedUsers(0, 1000);
      setDeletedUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load deleted users:', error);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await couponsAPI.getCompanies();
      // Filter out deleted companies
      const activeCompanies = Array.isArray(data) 
        ? data.filter((comp: any) => comp.status !== 'DELETED') 
        : [];
      setCompanies(activeCompanies);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  // Password validation function
  const validatePassword = (password: string): { valid: boolean; error: string } => {
    if (password.length < 8) {
      return { valid: false, error: t.users.passwordTooShort };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: t.users.passwordNeedsUppercase };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: t.users.passwordNeedsLowercase };
    }
    return { valid: true, error: '' };
  };

  const validateEmail = (email: string): string => {
    if (!email.trim()) return isRTL ? 'البريد الإلكتروني مطلوب' : 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return isRTL ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format';
    return '';
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return isRTL ? 'رقم الهاتف مطلوب' : 'Phone number is required';
    const cleaned = phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(cleaned)) return isRTL ? 'رقم الهاتف غير صحيح (7-15 رقم)' : 'Invalid phone number (7-15 digits)';
    return '';
  };

  const validateName = (name: string): string => {
    if (!name.trim()) return isRTL ? 'الاسم الكامل مطلوب' : 'Full name is required';
    if (name.trim().length < 2) return isRTL ? 'الاسم قصير جداً' : 'Name is too short';
    return '';
  };

  const [passwordError, setPasswordError] = useState('');

  const handleCreateCompanyUser = async () => {
    const errors: Record<string, string> = {};
    errors.full_name = validateName(companyUserForm.full_name);
    errors.email = validateEmail(companyUserForm.email);
    if (companyUserForm.phone_number.trim()) {
      errors.phone_number = validatePhone(companyUserForm.phone_number);
    }
    if (!companyUserForm.company_id) errors.company_id = isRTL ? 'يرجى اختيار الشركة' : 'Please select a company';
    const passwordValidation = validatePassword(companyUserForm.password);
    if (!passwordValidation.valid) errors.password = passwordValidation.error;

    // Filter out empty errors
    const activeErrors = Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
    setCompanyFormErrors(activeErrors);
    if (Object.keys(activeErrors).length > 0) return;

    try {
      await usersAPI.createCompanyUser({
        email: companyUserForm.email,
        password: companyUserForm.password,
        full_name: companyUserForm.full_name,
        company_id: parseInt(companyUserForm.company_id),
        phone_number: companyUserForm.phone_number || undefined,
      });
      alert(isRTL ? 'تم إنشاء مستخدم الشركة بنجاح!' : 'Company user created successfully!');
      setShowCreateCompanyUserModal(false);
      setCompanyUserForm({ email: '', password: '', full_name: '', company_id: '', phone_number: '' });
      setPasswordError('');
      setCompanyFormErrors({});
      loadUsers();
    } catch (error: any) {
      console.error('Failed to create company user:', error);
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (isRTL ? 'فشل في إنشاء مستخدم الشركة' : 'Failed to create company user');
      setCompanyFormErrors({ _general: msg });
    }
  };

  const [governmentPasswordError, setGovernmentPasswordError] = useState('');

  const handleCreateGovernmentUser = async () => {
    const errors: Record<string, string> = {};
    errors.full_name = validateName(governmentUserForm.full_name);
    errors.email = validateEmail(governmentUserForm.email);
    if (governmentUserForm.phone.trim()) {
      errors.phone = validatePhone(governmentUserForm.phone);
    }
    if (!governmentUserForm.city.trim()) errors.city = isRTL ? 'المدينة مطلوبة' : 'City is required';
    if (!governmentUserForm.district.trim()) errors.district = isRTL ? 'الحي مطلوب' : 'District is required';
    if (!governmentUserForm.job_description.trim()) errors.job_description = isRTL ? 'المسمى الوظيفي مطلوب' : 'Job description is required';
    const passwordValidation = validatePassword(governmentUserForm.password);
    if (!passwordValidation.valid) errors.password = passwordValidation.error;

    const activeErrors = Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
    setGovernmentFormErrors(activeErrors);
    if (Object.keys(activeErrors).length > 0) return;

    try {
      await usersAPI.createGovernmentUser({
        email: governmentUserForm.email,
        password: governmentUserForm.password,
        full_name: governmentUserForm.full_name,
        phone: governmentUserForm.phone || undefined,
        city: governmentUserForm.city || undefined,
        district: governmentUserForm.district || undefined,
        job_description: governmentUserForm.job_description || undefined,
      });
      alert(isRTL ? 'تم إنشاء الموظف الحكومي بنجاح!' : 'Government employee created successfully!');
      setShowCreateGovernmentUserModal(false);
      setGovernmentUserForm({ email: '', password: '', full_name: '', phone: '', city: '', district: '', job_description: '' });
      setGovernmentPasswordError('');
      setGovernmentFormErrors({});
      loadUsers();
    } catch (error: any) {
      console.error('Failed to create government user:', error);
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (isRTL ? 'فشل في إنشاء الموظف الحكومي' : 'Failed to create government employee');
      setGovernmentFormErrors({ _general: msg });
    }
  };

  const handleCreateNormalUser = async () => {
    const errors: Record<string, string> = {};
    errors.full_name = validateName(normalUserForm.full_name);
    errors.email = validateEmail(normalUserForm.email);
    errors.phone = validatePhone(normalUserForm.phone);
    const passwordValidation = validatePassword(normalUserForm.password);
    if (!passwordValidation.valid) errors.password = passwordValidation.error;

    const activeErrors = Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
    setNormalFormErrors(activeErrors);
    if (Object.keys(activeErrors).length > 0) return;

    try {
      await usersAPI.createNormalUser({
        email: normalUserForm.email,
        password: normalUserForm.password,
        full_name: normalUserForm.full_name,
        phone: normalUserForm.phone,
      });
      alert(isRTL ? 'تم إنشاء المستخدم بنجاح!' : 'User created successfully!');
      setShowCreateNormalUserModal(false);
      setNormalUserForm({ email: '', password: '', full_name: '', phone: '' });
      setNormalUserPasswordError('');
      setNormalFormErrors({});
      loadUsers();
    } catch (error: any) {
      console.error('Failed to create normal user:', error);
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (isRTL ? 'فشل في إنشاء المستخدم' : 'Failed to create user');
      setNormalFormErrors({ _general: msg });
    }
  };

  const handleCreateAdminUser = async () => {
    const errors: Record<string, string> = {};
    errors.full_name = validateName(adminUserForm.full_name);
    errors.email = validateEmail(adminUserForm.email);
    if (adminUserForm.phone.trim()) {
      errors.phone = validatePhone(adminUserForm.phone);
    }
    const passwordValidation = validatePassword(adminUserForm.password);
    if (!passwordValidation.valid) errors.password = passwordValidation.error;

    const activeErrors = Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
    setAdminFormErrors(activeErrors);
    if (Object.keys(activeErrors).length > 0) return;

    try {
      await usersAPI.createAdminUser({
        email: adminUserForm.email,
        password: adminUserForm.password,
        full_name: adminUserForm.full_name,
        phone: adminUserForm.phone || undefined,
      });
      alert(isRTL ? 'تم إنشاء المسؤول بنجاح!' : 'Admin created successfully!');
      setShowCreateAdminUserModal(false);
      setAdminUserForm({ email: '', password: '', full_name: '', phone: '' });
      setAdminUserPasswordError('');
      setAdminFormErrors({});
      loadUsers();
    } catch (error: any) {
      console.error('Failed to create admin user:', error);
      const detail = error.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (isRTL ? 'فشل في إنشاء المسؤول' : 'Failed to create admin');
      setAdminFormErrors({ _general: msg });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    // Validate passwords match
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      setResetPasswordError(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(resetPasswordForm.newPassword);
    if (!passwordValidation.valid) {
      setResetPasswordError(passwordValidation.error);
      return;
    }

    try {
      await usersAPI.resetPassword(selectedUser.id, resetPasswordForm.newPassword);
      alert(isRTL ? 'تم إعادة تعيين كلمة المرور بنجاح!' : 'Password reset successfully!');
      setShowResetPasswordModal(false);
      setResetPasswordForm({ newPassword: '', confirmPassword: '' });
      setResetPasswordError('');
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      alert(error.response?.data?.detail || (isRTL ? 'فشل في إعادة تعيين كلمة المرور' : 'Failed to reset password'));
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedUser || !points) return;

    try {
      await usersAPI.awardPoints(
        selectedUser.id,
        parseInt(points),
        description || 'Admin award'
      );
      alert('Points awarded successfully!');
      setShowAwardModal(false);
      setPoints('');
      setDescription('');
      loadUsers();
    } catch (error) {
      console.error('Failed to award points:', error);
      alert('Failed to award points');
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;

    try {
      await usersAPI.updateUser(selectedUser.id, editForm);
      alert('User updated successfully!');
      setShowEditModal(false);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await usersAPI.deleteUser(selectedUser.id);
      alert(isRTL ? 'تم نقل المستخدم إلى سلة المحذوفات!' : 'User moved to trash!');
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
      loadDeletedUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(isRTL ? 'فشل في حذف المستخدم' : 'Failed to delete user');
    }
  };

  const handleRestore = async () => {
    if (!selectedUser) return;

    try {
      await usersAPI.restoreUser(selectedUser.id);
      alert(isRTL ? 'تم استعادة المستخدم بنجاح!' : 'User restored successfully!');
      setShowRestoreModal(false);
      setSelectedUser(null);
      loadUsers();
      loadDeletedUsers();
    } catch (error) {
      console.error('Failed to restore user:', error);
      alert(isRTL ? 'فشل في استعادة المستخدم' : 'Failed to restore user');
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedUser) return;

    try {
      await usersAPI.permanentDeleteUser(selectedUser.id);
      alert(isRTL ? 'تم حذف المستخدم نهائياً!' : 'User permanently deleted!');
      setShowPermanentDeleteModal(false);
      setSelectedUser(null);
      loadDeletedUsers();
    } catch (error) {
      console.error('Failed to permanently delete user:', error);
      alert(isRTL ? 'فشل في حذف المستخدم نهائياً' : 'Failed to permanently delete user');
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
      <div className={`mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.users.title}</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{t.users.subtitle}</p>
        </div>
        <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setShowCreateNormalUserModal(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <UserPlus className="w-5 h-5" />
            <span className="hidden sm:inline">{isRTL ? 'إضافة مستخدم' : 'Add User'}</span>
            <span className="sm:hidden">{isRTL ? 'مستخدم' : 'User'}</span>
          </button>
          <button
            onClick={() => setShowCreateGovernmentUserModal(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Landmark className="w-5 h-5" />
            <span className="hidden sm:inline">{isRTL ? 'إضافة موظف حكومي' : 'Add Government Employee'}</span>
            <span className="sm:hidden">{isRTL ? 'موظف' : 'Gov'}</span>
          </button>
          <button
            onClick={() => setShowCreateCompanyUserModal(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition text-sm sm:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Building2 className="w-5 h-5" />
            <span className="hidden sm:inline">{t.users.createCompanyUser}</span>
            <span className="sm:hidden">{isRTL ? 'شركة' : 'Company'}</span>
          </button>
          <button
            onClick={() => setShowCreateAdminUserModal(true)}
            className={`flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm sm:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Shield className="w-5 h-5" />
            <span className="hidden sm:inline">{isRTL ? 'إضافة مسؤول' : 'Add Admin'}</span>
            <span className="sm:hidden">{isRTL ? 'مسؤول' : 'Admin'}</span>
          </button>
        </div>
      </div>

      {/* Tabs: Active Users / Trash */}
      <div className={`flex gap-4 mb-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 px-1 font-medium text-sm transition-colors ${
            activeTab === 'active'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <UserPlus className="w-4 h-4" />
            {isRTL ? 'المستخدمين' : 'Users'} ({users.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={`pb-3 px-1 font-medium text-sm transition-colors ${
            activeTab === 'trash'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Trash2 className="w-4 h-4" />
            {isRTL ? 'سلة المحذوفات' : 'Trash'} ({deletedUsers.length})
          </span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.users.searchPlaceholder}
            className={`w-full py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
          />
        </div>
        
        {/* Filters */}
        <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          {/* Role Filter */}
          <div className="flex-1 sm:max-w-[200px]">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white ${isRTL ? 'text-right' : ''}`}
            >
              <option value="ALL">{isRTL ? 'جميع الأدوار' : 'All Roles'}</option>
              <option value="USER">{t.users.roles.user}</option>
              <option value="COMPANY">{t.users.roles.company}</option>
              <option value="GOVERNMENT">{t.users.roles.government}</option>
              <option value="ADMIN">{t.users.roles.admin}</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="flex-1 sm:max-w-[200px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white ${isRTL ? 'text-right' : ''}`}
            >
              <option value="ALL">{isRTL ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="ACTIVE">{t.common.active}</option>
              <option value="SUSPENDED">{isRTL ? 'موقوف' : 'Suspended'}</option>
              <option value="BANNED">{isRTL ? 'محظور' : 'Banned'}</option>
            </select>
          </div>
          
          {/* Results count */}
          <div className={`flex items-center text-sm text-gray-500 ${isRTL ? 'sm:mr-auto' : 'sm:ml-auto'}`}>
            {isRTL 
              ? `${filteredUsers.length} من ${activeTab === 'active' ? users.length : deletedUsers.length} مستخدم`
              : `${filteredUsers.length} of ${activeTab === 'active' ? users.length : deletedUsers.length} users`
            }
          </div>
        </div>
      </div>

      {/* Active Users Table */}
      {activeTab === 'active' && (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.users.user}
                </th>
                <th className={`px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.users.userEmail}
                </th>
                <th className={`px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.users.userPoints}
                </th>
                <th className={`px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.users.role}
                </th>
                <th className={`px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.common.status}
                </th>
                <th className={`px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEdit(user)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                        {user.full_name[0]?.toUpperCase()}
                      </div>
                      <div className={isRTL ? 'mr-3 text-right' : 'ml-3'}>
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : ''}`}>
                    {user.email}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
                    <span className="text-yellow font-semibold">{user.total_points}</span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : user.role === 'COMPANY'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isRTL ? 'text-right' : ''}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                        setShowAwardModal(true);
                      }}
                      className={`text-primary hover:text-blue-800 font-medium ${isRTL ? 'ml-2' : 'mr-2'}`}
                      title={t.users.award}
                    >
                      <Award className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                        setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                        setResetPasswordError('');
                        setShowResetPasswordModal(true);
                      }}
                      className={`text-orange-600 hover:text-orange-800 font-medium ${isRTL ? 'ml-2' : 'mr-2'}`}
                      title={isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                    >
                      <KeyRound className="w-4 h-4 inline" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(user);
                      }}
                      className={`text-green-600 hover:text-green-800 font-medium ${isRTL ? 'ml-2' : 'mr-2'}`}
                    >
                      {t.common.edit}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      {t.common.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">{t.users.noUsersFound}</p>
          </div>
        )}
      </div>
      )}

      {/* Trash Table */}
      {activeTab === 'trash' && (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-red-50 border-b border-red-200">
              <tr>
                <th className={`px-6 py-4 text-xs font-semibold text-red-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.users.user}
                </th>
                <th className={`px-6 py-4 text-xs font-semibold text-red-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.users.userEmail}
                </th>
                <th className={`px-6 py-4 text-xs font-semibold text-red-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.users.role}
                </th>
                <th className={`px-6 py-4 text-xs font-semibold text-red-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'تاريخ الحذف' : 'Deleted At'}
                </th>
                <th className={`px-6 py-4 text-xs font-semibold text-red-600 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-red-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className="w-10 h-10 rounded-full bg-red-400 text-white flex items-center justify-center font-semibold">
                        {user.full_name[0]?.toUpperCase()}
                      </div>
                      <div className={isRTL ? 'mr-3 text-right' : 'ml-3'}>
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-600 ${isRTL ? 'text-right' : ''}`}>
                    {user.email}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : ''}`}>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : user.role === 'COMPANY'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                    {user.deleted_at ? new Date(user.deleted_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isRTL ? 'text-right' : ''}`}>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRestoreModal(true);
                      }}
                      className={`text-green-600 hover:text-green-800 font-medium ${isRTL ? 'ml-3' : 'mr-3'}`}
                      title={isRTL ? 'استعادة' : 'Restore'}
                    >
                      <RotateCcw className="w-4 h-4 inline" /> {isRTL ? 'استعادة' : 'Restore'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPermanentDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-800 font-medium"
                      title={isRTL ? 'حذف نهائي' : 'Delete Forever'}
                    >
                      <Trash2 className="w-4 h-4 inline" /> {isRTL ? 'حذف نهائي' : 'Delete Forever'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Trash2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">{isRTL ? 'سلة المحذوفات فارغة' : 'Trash is empty'}</p>
          </div>
        )}
      </div>
      )}

      {/* Award Points Modal */}
      {showAwardModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t.users.awardPointsTo} {selectedUser.full_name}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userPoints}
                </label>
                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="100"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.reports.reportDescription}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  rows={3}
                  placeholder={t.users.descriptionPlaceholder}
                />
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowAwardModal(false);
                  setPoints('');
                  setDescription('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleAwardPoints}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800"
              >
                {t.users.awardPoints}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t.users.editUser}: {selectedUser.full_name}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.fullName}
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userEmail}
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.role}
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                >
                  <option value="USER">{t.users.roles.user}</option>
                  <option value="COMPANY">{t.users.roles.company}</option>
                  <option value="GOVERNMENT">{t.users.roles.government}</option>
                  <option value="ADMIN">{t.users.roles.admin}</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.common.status}
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                >
                  <option value="ACTIVE">{t.common.active}</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="BANNED">BANNED</option>
                </select>
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800"
              >
                {t.users.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-red-600 mb-4 ${isRTL ? 'text-right' : ''}`}>{t.users.deleteUser}</h2>
            <p className={`text-gray-700 mb-6 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'هل أنت متأكد من نقل' : 'Are you sure you want to move'} <strong>{selectedUser.full_name}</strong> {isRTL ? 'إلى سلة المحذوفات؟' : 'to trash?'}
            </p>
            <p className={`text-sm text-gray-500 mb-6 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'يمكنك استعادة المستخدم لاحقاً من سلة المحذوفات.' : 'You can restore the user later from trash.'}
            </p>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {isRTL ? 'نقل للمحذوفات' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore User Modal */}
      {showRestoreModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-green-600 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <RotateCcw className="w-6 h-6" />
              {isRTL ? 'استعادة المستخدم' : 'Restore User'}
            </h2>
            <p className={`text-gray-700 mb-6 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'هل تريد استعادة' : 'Do you want to restore'} <strong>{selectedUser.full_name}</strong>?
            </p>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleRestore}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {isRTL ? 'استعادة' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {showPermanentDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-red-600 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <Trash2 className="w-6 h-6" />
              {isRTL ? 'حذف نهائي' : 'Permanent Delete'}
            </h2>
            <p className={`text-gray-700 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'هل أنت متأكد من حذف' : 'Are you sure you want to permanently delete'} <strong>{selectedUser.full_name}</strong>?
            </p>
            <p className={`text-sm text-red-500 font-medium mb-6 p-3 bg-red-50 rounded-lg ${isRTL ? 'text-right' : ''}`}>
              ⚠️ {isRTL ? 'هذا الإجراء لا يمكن التراجع عنه! سيتم حذف جميع بيانات المستخدم نهائياً.' : 'This action cannot be undone! All user data will be permanently deleted.'}
            </p>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowPermanentDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handlePermanentDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {isRTL ? 'حذف نهائي' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <KeyRound className="w-6 h-6 text-orange-600" />
              {isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
            </h2>
            <p className={`text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL 
                ? `إعادة تعيين كلمة المرور للمستخدم: ${selectedUser.full_name}` 
                : `Reset password for user: ${selectedUser.full_name}`}
            </p>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'كلمة المرور الجديدة' : 'New Password'} *
                </label>
                <input
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={(e) => {
                    setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value });
                    setResetPasswordError('');
                  }}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="********"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'} *
                </label>
                <input
                  type="password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) => {
                    setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value });
                    setResetPasswordError('');
                  }}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="********"
                />
              </div>
              {resetPasswordError && (
                <p className={`text-red-500 text-sm ${isRTL ? 'text-right' : ''}`}>{resetPasswordError}</p>
              )}
              {/* Password requirements */}
              <div className={`text-xs text-gray-500 space-y-1 ${isRTL ? 'text-right' : ''}`}>
                <p className={resetPasswordForm.newPassword.length >= 8 ? 'text-green-600' : ''}>
                  {isRTL ? '• 8 أحرف على الأقل' : '• At least 8 characters'}
                </p>
                <p className={/[A-Z]/.test(resetPasswordForm.newPassword) ? 'text-green-600' : ''}>
                  {isRTL ? '• حرف كبير واحد على الأقل' : '• At least one uppercase letter'}
                </p>
                <p className={/[a-z]/.test(resetPasswordForm.newPassword) ? 'text-green-600' : ''}>
                  {isRTL ? '• حرف صغير واحد على الأقل' : '• At least one lowercase letter'}
                </p>
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordForm({ newPassword: '', confirmPassword: '' });
                  setResetPasswordError('');
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleResetPassword}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                {isRTL ? 'إعادة تعيين' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Company User Modal */}
      {showCreateCompanyUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <Building2 className="w-6 h-6 text-primary" />
              {t.users.createCompanyUser}
            </h2>
            <p className={`text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t.users.createCompanyUserDesc}
            </p>
            {companyFormErrors._general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className={`text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{companyFormErrors._general}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.fullName} *
                </label>
                <input
                  type="text"
                  value={companyUserForm.full_name}
                  onChange={(e) => {
                    setCompanyUserForm({ ...companyUserForm, full_name: e.target.value });
                    setCompanyFormErrors((prev) => { const n = {...prev}; delete n.full_name; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${companyFormErrors.full_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="John Doe"
                />
                {companyFormErrors.full_name && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{companyFormErrors.full_name}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userEmail} *
                </label>
                <input
                  type="email"
                  value={companyUserForm.email}
                  onChange={(e) => {
                    setCompanyUserForm({ ...companyUserForm, email: e.target.value });
                    setCompanyFormErrors((prev) => { const n = {...prev}; delete n.email; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${companyFormErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="user@company.com"
                />
                {companyFormErrors.email && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{companyFormErrors.email}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userPhone}
                </label>
                <input
                  type="tel"
                  value={companyUserForm.phone_number}
                  onChange={(e) => {
                    setCompanyUserForm({ ...companyUserForm, phone_number: e.target.value });
                    setCompanyFormErrors((prev) => { const n = {...prev}; delete n.phone_number; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${companyFormErrors.phone_number ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? '+966 5XX XXX XXXX' : '+966 5XX XXX XXXX'}
                  dir="ltr"
                />
                {companyFormErrors.phone_number && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{companyFormErrors.phone_number}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.auth.password} *
                </label>
                <input
                  type="password"
                  value={companyUserForm.password}
                  onChange={(e) => {
                    setCompanyUserForm({ ...companyUserForm, password: e.target.value });
                    setPasswordError('');
                    setCompanyFormErrors((prev) => { const n = {...prev}; delete n.password; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${passwordError || companyFormErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="••••••••"
                  minLength={8}
                />
                {/* Password requirements */}
                <div className={`mt-2 text-xs ${isRTL ? 'text-right' : ''}`}>
                  <p className={`${companyUserForm.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ ٨ أحرف على الأقل' : '✓ At least 8 characters'}
                  </p>
                  <p className={`${/[A-Z]/.test(companyUserForm.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف كبير واحد على الأقل (A-Z)' : '✓ At least one uppercase letter (A-Z)'}
                  </p>
                  <p className={`${/[a-z]/.test(companyUserForm.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف صغير واحد على الأقل (a-z)' : '✓ At least one lowercase letter (a-z)'}
                  </p>
                </div>
                {passwordError && (
                  <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{passwordError}</p>
                )}
                {/* Note about password change on first login */}
                <p className={`mt-2 text-xs text-blue-600 ${isRTL ? 'text-right' : ''}`}>
                  ℹ️ {t.users.mustChangePasswordNote}
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.company} *
                </label>
                <select
                  value={companyUserForm.company_id}
                  onChange={(e) => {
                    setCompanyUserForm({ ...companyUserForm, company_id: e.target.value });
                    setCompanyFormErrors((prev) => { const n = {...prev}; delete n.company_id; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${companyFormErrors.company_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                >
                  <option value="">{t.users.selectCompany}</option>
                  {companies.map((company: any) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {companyFormErrors.company_id && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{companyFormErrors.company_id}</p>}
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateCompanyUserModal(false);
                  setCompanyUserForm({ email: '', password: '', full_name: '', company_id: '', phone_number: '' });
                  setPasswordError('');
                  setCompanyFormErrors({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleCreateCompanyUser}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800"
              >
                {t.users.createUser}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Government User Modal */}
      {showCreateGovernmentUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <Landmark className="w-6 h-6 text-green-600" />
              {isRTL ? 'إضافة موظف حكومي' : 'Add Government Employee'}
            </h2>
            <p className={`text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL 
                ? 'إنشاء حساب موظف حكومي للوصول إلى البلاغات والخريطة' 
                : 'Create a government employee account with access to reports and map'}
            </p>
            {governmentFormErrors._general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className={`text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{governmentFormErrors._general}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.fullName} *
                </label>
                <input
                  type="text"
                  value={governmentUserForm.full_name}
                  onChange={(e) => {
                    setGovernmentUserForm({ ...governmentUserForm, full_name: e.target.value });
                    setGovernmentFormErrors((prev) => { const n = {...prev}; delete n.full_name; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${governmentFormErrors.full_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? 'محمد أحمد' : 'John Doe'}
                />
                {governmentFormErrors.full_name && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{governmentFormErrors.full_name}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userEmail} *
                </label>
                <input
                  type="email"
                  value={governmentUserForm.email}
                  onChange={(e) => {
                    setGovernmentUserForm({ ...governmentUserForm, email: e.target.value });
                    setGovernmentFormErrors((prev) => { const n = {...prev}; delete n.email; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${governmentFormErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="user@gov.sa"
                />
                {governmentFormErrors.email && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{governmentFormErrors.email}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userPhone}
                </label>
                <input
                  type="tel"
                  value={governmentUserForm.phone}
                  onChange={(e) => {
                    setGovernmentUserForm({ ...governmentUserForm, phone: e.target.value });
                    setGovernmentFormErrors((prev) => { const n = {...prev}; delete n.phone; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${governmentFormErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? '+966 5XX XXX XXXX' : '+966 5XX XXX XXXX'}
                  dir="ltr"
                />
                {governmentFormErrors.phone && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{governmentFormErrors.phone}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'المدينة' : 'City'} *
                </label>
                <input
                  type="text"
                  value={governmentUserForm.city}
                  onChange={(e) => {
                    setGovernmentUserForm({ ...governmentUserForm, city: e.target.value });
                    setGovernmentFormErrors((prev) => { const n = {...prev}; delete n.city; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${governmentFormErrors.city ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? 'الرياض' : 'Riyadh'}
                />
                {governmentFormErrors.city && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{governmentFormErrors.city}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'الحي' : 'District'} *
                </label>
                <input
                  type="text"
                  value={governmentUserForm.district}
                  onChange={(e) => {
                    setGovernmentUserForm({ ...governmentUserForm, district: e.target.value });
                    setGovernmentFormErrors((prev) => { const n = {...prev}; delete n.district; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${governmentFormErrors.district ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? 'العليا' : 'Al Olaya'}
                />
                {governmentFormErrors.district && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{governmentFormErrors.district}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'المسمى الوظيفي' : 'Job Description'} *
                </label>
                <input
                  type="text"
                  value={governmentUserForm.job_description}
                  onChange={(e) => {
                    setGovernmentUserForm({ ...governmentUserForm, job_description: e.target.value });
                    setGovernmentFormErrors((prev) => { const n = {...prev}; delete n.job_description; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${governmentFormErrors.job_description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? 'مراقب بلدي' : 'Municipal Inspector'}
                />
                {governmentFormErrors.job_description && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{governmentFormErrors.job_description}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.auth.password} *
                </label>
                <input
                  type="password"
                  value={governmentUserForm.password}
                  onChange={(e) => {
                    setGovernmentUserForm({ ...governmentUserForm, password: e.target.value });
                    setGovernmentPasswordError('');
                    setGovernmentFormErrors((prev) => { const n = {...prev}; delete n.password; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${governmentPasswordError || governmentFormErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="••••••••"
                  minLength={8}
                />
                {/* Password requirements */}
                <div className={`mt-2 text-xs ${isRTL ? 'text-right' : ''}`}>
                  <p className={`${governmentUserForm.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ ٨ أحرف على الأقل' : '✓ At least 8 characters'}
                  </p>
                  <p className={`${/[A-Z]/.test(governmentUserForm.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف كبير واحد على الأقل (A-Z)' : '✓ At least one uppercase letter (A-Z)'}
                  </p>
                  <p className={`${/[a-z]/.test(governmentUserForm.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف صغير واحد على الأقل (a-z)' : '✓ At least one lowercase letter (a-z)'}
                  </p>
                </div>
                {governmentPasswordError && (
                  <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{governmentPasswordError}</p>
                )}
                {/* Note about password change on first login */}
                <p className={`mt-2 text-xs text-blue-600 ${isRTL ? 'text-right' : ''}`}>
                  ℹ️ {t.users.mustChangePasswordNote}
                </p>
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateGovernmentUserModal(false);
                  setGovernmentUserForm({ email: '', password: '', full_name: '', phone: '', city: '', district: '', job_description: '' });
                  setGovernmentPasswordError('');
                  setGovernmentFormErrors({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleCreateGovernmentUser}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {t.users.createUser}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Normal User Modal */}
      {showCreateNormalUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <UserPlus className="w-6 h-6 text-purple-600" />
              {isRTL ? 'إضافة مستخدم جديد' : 'Add New User'}
            </h2>
            <p className={`text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL 
                ? 'إنشاء حساب مستخدم عادي يمكنه الإبلاغ وكسب النقاط' 
                : 'Create a normal user account who can report issues and earn points'}
            </p>
            {normalFormErrors._general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className={`text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{normalFormErrors._general}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.fullName} *
                </label>
                <input
                  type="text"
                  value={normalUserForm.full_name}
                  onChange={(e) => {
                    setNormalUserForm({ ...normalUserForm, full_name: e.target.value });
                    setNormalFormErrors((prev) => { const n = {...prev}; delete n.full_name; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${normalFormErrors.full_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? 'محمد أحمد' : 'John Doe'}
                />
                {normalFormErrors.full_name && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{normalFormErrors.full_name}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userEmail} *
                </label>
                <input
                  type="email"
                  value={normalUserForm.email}
                  onChange={(e) => {
                    setNormalUserForm({ ...normalUserForm, email: e.target.value });
                    setNormalFormErrors((prev) => { const n = {...prev}; delete n.email; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${normalFormErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="user@example.com"
                />
                {normalFormErrors.email && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{normalFormErrors.email}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userPhone} *
                </label>
                <input
                  type="tel"
                  value={normalUserForm.phone}
                  onChange={(e) => {
                    setNormalUserForm({ ...normalUserForm, phone: e.target.value });
                    setNormalFormErrors((prev) => { const n = {...prev}; delete n.phone; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${normalFormErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? '+966 5XX XXX XXXX' : '+966 5XX XXX XXXX'}
                  dir="ltr"
                />
                {normalFormErrors.phone && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{normalFormErrors.phone}</p>}
                <p className={`mt-1 text-xs text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'رقم الهاتف مطلوب للمستخدمين العاديين' : 'Phone number is required for normal users'}
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.auth.password} *
                </label>
                <input
                  type="password"
                  value={normalUserForm.password}
                  onChange={(e) => {
                    setNormalUserForm({ ...normalUserForm, password: e.target.value });
                    setNormalUserPasswordError('');
                    setNormalFormErrors((prev) => { const n = {...prev}; delete n.password; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${normalUserPasswordError || normalFormErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="••••••••"
                  minLength={8}
                />
                {/* Password requirements */}
                <div className={`mt-2 text-xs ${isRTL ? 'text-right' : ''}`}>
                  <p className={`${normalUserForm.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ ٨ أحرف على الأقل' : '✓ At least 8 characters'}
                  </p>
                  <p className={`${/[A-Z]/.test(normalUserForm.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف كبير واحد على الأقل (A-Z)' : '✓ At least one uppercase letter (A-Z)'}
                  </p>
                  <p className={`${/[a-z]/.test(normalUserForm.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف صغير واحد على الأقل (a-z)' : '✓ At least one lowercase letter (a-z)'}
                  </p>
                </div>
                {normalUserPasswordError && (
                  <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{normalUserPasswordError}</p>
                )}
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateNormalUserModal(false);
                  setNormalUserForm({ email: '', password: '', full_name: '', phone: '' });
                  setNormalUserPasswordError('');
                  setNormalFormErrors({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleCreateNormalUser}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {t.users.createUser}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin User Modal */}
      {showCreateAdminUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
              <Shield className="w-6 h-6 text-red-600" />
              {isRTL ? 'إضافة مسؤول جديد' : 'Add New Admin'}
            </h2>
            <p className={`text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL 
                ? 'إنشاء حساب مسؤول بصلاحيات كاملة للوصول إلى لوحة التحكم' 
                : 'Create an admin account with full access to the dashboard'}
            </p>
            {adminFormErrors._general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg">
                <p className={`text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{adminFormErrors._general}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.fullName} *
                </label>
                <input
                  type="text"
                  value={adminUserForm.full_name}
                  onChange={(e) => {
                    setAdminUserForm({ ...adminUserForm, full_name: e.target.value });
                    setAdminFormErrors((prev) => { const n = {...prev}; delete n.full_name; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${adminFormErrors.full_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? 'محمد أحمد' : 'John Doe'}
                />
                {adminFormErrors.full_name && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{adminFormErrors.full_name}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userEmail} *
                </label>
                <input
                  type="email"
                  value={adminUserForm.email}
                  onChange={(e) => {
                    setAdminUserForm({ ...adminUserForm, email: e.target.value });
                    setAdminFormErrors((prev) => { const n = {...prev}; delete n.email; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${adminFormErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="admin@example.com"
                />
                {adminFormErrors.email && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{adminFormErrors.email}</p>}
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userPhone}
                </label>
                <input
                  type="tel"
                  value={adminUserForm.phone}
                  onChange={(e) => {
                    setAdminUserForm({ ...adminUserForm, phone: e.target.value });
                    setAdminFormErrors((prev) => { const n = {...prev}; delete n.phone; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${adminFormErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? '+966 5XX XXX XXXX' : '+966 5XX XXX XXXX'}
                  dir="ltr"
                />
                {adminFormErrors.phone && <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{adminFormErrors.phone}</p>}
                <p className={`mt-1 text-xs text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'رقم الهاتف اختياري للمسؤولين' : 'Phone number is optional for admins'}
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.auth.password} *
                </label>
                <input
                  type="password"
                  value={adminUserForm.password}
                  onChange={(e) => {
                    setAdminUserForm({ ...adminUserForm, password: e.target.value });
                    setAdminUserPasswordError('');
                    setAdminFormErrors((prev) => { const n = {...prev}; delete n.password; return n; });
                  }}
                  className={`w-full px-4 py-2 border ${adminUserPasswordError || adminFormErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="••••••••"
                  minLength={8}
                />
                {/* Password requirements */}
                <div className={`mt-2 text-xs ${isRTL ? 'text-right' : ''}`}>
                  <p className={`${adminUserForm.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ ٨ أحرف على الأقل' : '✓ At least 8 characters'}
                  </p>
                  <p className={`${/[A-Z]/.test(adminUserForm.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف كبير واحد على الأقل (A-Z)' : '✓ At least one uppercase letter (A-Z)'}
                  </p>
                  <p className={`${/[a-z]/.test(adminUserForm.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {isRTL ? '✓ حرف صغير واحد على الأقل (a-z)' : '✓ At least one lowercase letter (a-z)'}
                  </p>
                </div>
                {adminUserPasswordError && (
                  <p className={`mt-1 text-sm text-red-600 ${isRTL ? 'text-right' : ''}`}>{adminUserPasswordError}</p>
                )}
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateAdminUserModal(false);
                  setAdminUserForm({ email: '', password: '', full_name: '', phone: '' });
                  setAdminUserPasswordError('');
                  setAdminFormErrors({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleCreateAdminUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t.users.createUser}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
