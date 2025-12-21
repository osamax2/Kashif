'use client';

import { couponsAPI, usersAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { User } from '@/lib/types';
import { Award, Building2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function UsersPage() {
  const { t, isRTL } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateCompanyUserModal, setShowCreateCompanyUserModal] = useState(false);
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

  useEffect(() => {
    loadUsers();
    loadCompanies();
  }, []);

  useEffect(() => {
    let filtered = users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );
    
    // Apply role filter
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }
    
    setFilteredUsers(filtered);
  }, [search, users, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersAPI.getUsers(0, 1000);
      setUsers(Array.isArray(data) ? data : []);
      setFilteredUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
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

  const [passwordError, setPasswordError] = useState('');

  const handleCreateCompanyUser = async () => {
    if (!companyUserForm.email || !companyUserForm.password || !companyUserForm.full_name || !companyUserForm.company_id) {
      alert(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields');
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(companyUserForm.password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error);
      return;
    }

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
      loadUsers();
    } catch (error: any) {
      console.error('Failed to create company user:', error);
      alert(error.response?.data?.detail || (isRTL ? 'فشل في إنشاء مستخدم الشركة' : 'Failed to create company user'));
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
      alert('User deleted successfully!');
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
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
        <button
          onClick={() => setShowCreateCompanyUserModal(true)}
          className={`flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition text-sm sm:text-base w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Building2 className="w-5 h-5" />
          <span className="hidden sm:inline">{t.users.createCompanyUser}</span>
          <span className="sm:hidden">{isRTL ? 'إضافة مستخدم' : 'Add User'}</span>
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
              ? `${filteredUsers.length} من ${users.length} مستخدم`
              : `${filteredUsers.length} of ${users.length} users`
            }
          </div>
        </div>
      </div>

      {/* Users Table */}
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
                <tr key={user.id} className="hover:bg-gray-50">
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
                      onClick={() => {
                        setSelectedUser(user);
                        setShowAwardModal(true);
                      }}
                      className={`text-primary hover:text-blue-800 font-medium ${isRTL ? 'ml-3' : 'mr-3'}`}
                    >
                      <Award className={`w-4 h-4 inline ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      {t.users.award}
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className={`text-green-600 hover:text-green-800 font-medium ${isRTL ? 'ml-3' : 'mr-3'}`}
                    >
                      {t.common.edit}
                    </button>
                    <button
                      onClick={() => {
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
              {t.users.confirmDelete} <strong>{selectedUser.full_name}</strong>? {t.users.deleteConfirmText}
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
                {t.common.delete}
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
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.fullName} *
                </label>
                <input
                  type="text"
                  value={companyUserForm.full_name}
                  onChange={(e) => setCompanyUserForm({ ...companyUserForm, full_name: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userEmail} *
                </label>
                <input
                  type="email"
                  value={companyUserForm.email}
                  onChange={(e) => setCompanyUserForm({ ...companyUserForm, email: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder="user@company.com"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t.users.userPhone}
                </label>
                <input
                  type="tel"
                  value={companyUserForm.phone_number}
                  onChange={(e) => setCompanyUserForm({ ...companyUserForm, phone_number: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? '+966 5XX XXX XXXX' : '+966 5XX XXX XXXX'}
                  dir="ltr"
                />
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
                  }}
                  className={`w-full px-4 py-2 border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
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
                  onChange={(e) => setCompanyUserForm({ ...companyUserForm, company_id: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none ${isRTL ? 'text-right' : ''}`}
                >
                  <option value="">{t.users.selectCompany}</option>
                  {companies.map((company: any) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateCompanyUserModal(false);
                  setCompanyUserForm({ email: '', password: '', full_name: '', company_id: '', phone_number: '' });
                  setPasswordError('');
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
    </div>
  );
}
