'use client';

import { couponsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Building2, Plus, Tag } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Coupon {
  id: number;
  company_id: number;
  coupon_category_id: number;
  name: string;
  description: string;
  points_cost: number;
  image_url?: string;
  expiration_date: string;
  max_usage_per_user?: number;
  total_available?: number;
  status: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: string;
  company_id?: number;
}

export default function CouponsPage() {
  const { t, isRTL } = useLanguage();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_cost: '',
    company_id: '',
    coupon_category_id: '',
    image_url: '',
    expiration_date: '',
    max_usage_per_user: '',
    total_available: '',
    status: 'ACTIVE',
  });

  // Check if user is COMPANY role
  const isCompanyUser = userProfile?.role === 'COMPANY';

  useEffect(() => {
    // Load user profile from localStorage
    const storedProfile = localStorage.getItem('user_profile');
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile);
        setUserProfile(profile);
        // If COMPANY user, pre-set the company_id in formData
        if (profile.role === 'COMPANY' && profile.company_id != null) {
          setFormData(prev => ({ ...prev, company_id: String(profile.company_id) }));
        }
      } catch (e) {
        console.error('Error parsing user profile:', e);
      }
    }
    
    loadCoupons();
    loadCompanies();
    loadCategories();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await couponsAPI.getCoupons({ limit: 1000 });
      setCoupons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await couponsAPI.getCompanies();
      // Filter out deleted companies
      const activeCompanies = Array.isArray(data) 
        ? data.filter(comp => comp.status !== 'DELETED') 
        : [];
      setCompanies(activeCompanies);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await couponsAPI.getCategories();
      // Filter out deleted categories
      const activeCategories = Array.isArray(data) 
        ? data.filter(cat => cat.status !== 'DELETED') 
        : [];
      setCategories(activeCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleCreate = async () => {
    // Validate points_cost
    const pointsCost = parseInt(formData.points_cost);
    if (isNaN(pointsCost) || pointsCost < 0 || pointsCost > 100000) {
      alert(isRTL ? 'تكلفة النقاط يجب أن تكون بين 0 و 100000' : 'Points cost must be between 0 and 100,000');
      return;
    }
    
    try {
      const createData: any = {
        company_id: parseInt(formData.company_id),
        name: formData.name,
        description: formData.description,
        points_cost: pointsCost,
      };
      
      if (formData.coupon_category_id) {
        createData.coupon_category_id = parseInt(formData.coupon_category_id);
      }
      if (formData.image_url && formData.image_url.trim()) {
        createData.image_url = formData.image_url.trim();
      }
      if (formData.expiration_date && formData.expiration_date.trim()) {
        createData.expiration_date = new Date(formData.expiration_date).toISOString();
      }
      if (formData.max_usage_per_user) {
        createData.max_usage_per_user = parseInt(formData.max_usage_per_user);
      }
      if (formData.total_available) {
        createData.total_available = parseInt(formData.total_available);
      }

      await couponsAPI.createCoupon(createData);
      alert(isRTL ? 'تم إنشاء الكوبون بنجاح!' : 'Coupon created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadCoupons();
    } catch (error: any) {
      console.error('Failed to create coupon:', error);
      if (error.response?.status !== 401) {
        alert(isRTL ? 'فشل إنشاء الكوبون' : 'Failed to create coupon');
      }
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      name: coupon.name || '',
      description: coupon.description || '',
      points_cost: coupon.points_cost != null ? String(coupon.points_cost) : '',
      company_id: coupon.company_id != null ? String(coupon.company_id) : '',
      coupon_category_id: coupon.coupon_category_id != null ? String(coupon.coupon_category_id) : '',
      image_url: coupon.image_url || '',
      expiration_date: coupon.expiration_date ? coupon.expiration_date.split('T')[0] : '',
      max_usage_per_user: coupon.max_usage_per_user != null ? String(coupon.max_usage_per_user) : '',
      total_available: coupon.total_available != null ? String(coupon.total_available) : '',
      status: coupon.status || 'ACTIVE',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedCoupon) return;

    // Validate points_cost if provided
    if (formData.points_cost && formData.points_cost.toString().trim()) {
      const pointsCost = parseInt(formData.points_cost);
      if (isNaN(pointsCost) || pointsCost < 0 || pointsCost > 100000) {
        alert(isRTL ? 'تكلفة النقاط يجب أن تكون بين 0 و 100000' : 'Points cost must be between 0 and 100,000');
        return;
      }
    }

    try {
      const updateData: any = {};
      
      if (formData.name && formData.name.trim()) updateData.name = formData.name.trim();
      if (formData.description && formData.description.trim()) updateData.description = formData.description.trim();
      if (formData.points_cost && formData.points_cost.toString().trim()) {
        updateData.points_cost = parseInt(formData.points_cost);
      }
      if (formData.image_url && formData.image_url.trim()) updateData.image_url = formData.image_url.trim();
      if (formData.status && formData.status.trim()) updateData.status = formData.status.trim();
      if (formData.expiration_date && formData.expiration_date.trim()) {
        updateData.expiration_date = new Date(formData.expiration_date).toISOString();
      }
      if (formData.max_usage_per_user && formData.max_usage_per_user.toString().trim()) {
        updateData.max_usage_per_user = parseInt(formData.max_usage_per_user);
      }
      if (formData.total_available && formData.total_available.toString().trim()) {
        updateData.total_available = parseInt(formData.total_available);
      }
      if (formData.company_id && formData.company_id.toString().trim()) {
        updateData.company_id = parseInt(formData.company_id);
      }
      if (formData.coupon_category_id && formData.coupon_category_id.toString().trim()) {
        updateData.coupon_category_id = parseInt(formData.coupon_category_id);
      }

      await couponsAPI.updateCoupon(selectedCoupon.id, updateData);
      alert(isRTL ? 'تم تحديث الكوبون بنجاح!' : 'Coupon updated successfully!');
      setShowEditModal(false);
      resetForm();
      loadCoupons();
    } catch (error: any) {
      console.error('Failed to update coupon:', error);
      // Don't show alert for 401 (handled by interceptor redirect)
      if (error.response?.status !== 401) {
        alert(isRTL ? 'فشل تحديث الكوبون' : 'Failed to update coupon');
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedCoupon) return;
    try {
      await couponsAPI.deleteCoupon(selectedCoupon.id);
      alert(isRTL ? 'تم حذف الكوبون بنجاح!' : 'Coupon deleted successfully!');
      setShowDeleteModal(false);
      setSelectedCoupon(null);
      loadCoupons();
    } catch (error: any) {
      console.error('Failed to delete coupon:', error);
      if (error.response?.status !== 401) {
        alert(isRTL ? 'فشل حذف الكوبون' : 'Failed to delete coupon');
      }
    }
  };

  const resetForm = () => {
    // For COMPANY users, keep their company_id
    const companyId = userProfile?.role === 'COMPANY' && userProfile?.company_id != null
      ? String(userProfile.company_id) 
      : '';
    
    setFormData({
      name: '',
      description: '',
      points_cost: '',
      company_id: companyId,
      coupon_category_id: '',
      image_url: '',
      expiration_date: '',
      max_usage_per_user: '',
      total_available: '',
      status: 'ACTIVE',
    });
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.nav.coupons}</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            {isCompanyUser ? t.coupons.companySubtitle : t.coupons.subtitle}
          </p>
        </div>
        <div className={`flex flex-wrap gap-2 sm:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {!isCompanyUser && (
            <>
              <Link
                href="/dashboard/companies"
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">{t.nav.companies}</span>
              </Link>
              <Link
                href="/dashboard/categories"
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">{t.nav.categories}</span>
              </Link>
            </>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">{t.coupons.createCoupon}</span>
            <span className="xs:hidden">{isRTL ? 'إضافة' : 'Add'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition">
            {coupon.image_url && (
              <img
                src={coupon.image_url}
                alt={coupon.name}
                className="w-full h-40 object-cover rounded-lg mb-4"
              />
            )}
            <h3 className={`font-semibold text-gray-900 text-lg mb-2 ${isRTL ? 'text-right' : ''}`}>{coupon.name}</h3>
            <p className={`text-gray-600 text-sm mb-3 line-clamp-2 ${isRTL ? 'text-right' : ''}`}>{coupon.description}</p>
            <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-yellow-600 font-bold">{coupon.points_cost} {t.coupons.points}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                coupon.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {coupon.status}
              </span>
            </div>
            <div className={`flex flex-col xs:flex-row gap-2 ${isRTL ? 'xs:flex-row-reverse' : ''}`}>
              <button
                onClick={() => handleEdit(coupon)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition"
              >
                {t.common.edit}
              </button>
              <button
                onClick={() => {
                  setSelectedCoupon(coupon);
                  setShowDeleteModal(true);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-xs sm:text-sm rounded-lg hover:bg-red-700 transition"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        ))}
      </div>

      {coupons.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{t.coupons.noCouponsFound}</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>{t.coupons.createNewCoupon}</h2>
            <CouponForm 
              formData={formData} 
              setFormData={setFormData}
              companies={companies}
              categories={categories}
              isCompanyUser={isCompanyUser}
              t={t}
              isRTL={isRTL}
            />
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800"
              >
                {t.coupons.createCoupon}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCoupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>{t.coupons.editCoupon}</h2>
            <CouponForm 
              formData={formData} 
              setFormData={setFormData}
              companies={companies}
              categories={categories}
              isCompanyUser={isCompanyUser}
              t={t}
              isRTL={isRTL}
            />
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
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
      {showDeleteModal && selectedCoupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-red-600 mb-4 ${isRTL ? 'text-right' : ''}`}>{t.coupons.deleteCoupon}</h2>
            <p className={`text-gray-700 mb-6 ${isRTL ? 'text-right' : ''}`}>
              {t.coupons.confirmDelete} <strong>{selectedCoupon.name}</strong>?
            </p>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCoupon(null);
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
    </div>
  );
}

function CouponForm({ formData, setFormData, companies, categories, isCompanyUser, t, isRTL }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.couponName} *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          required
        />
      </div>
      
      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.pointsCost} *</label>
        <input
          type="number"
          min="0"
          max="100000"
          value={formData.points_cost}
          onChange={(e) => {
            const value = e.target.value;
            const numValue = parseInt(value) || 0;
            if (value === '' || (numValue >= 0 && numValue <= 100000)) {
              setFormData({ ...formData, points_cost: value });
            }
          }}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          placeholder="0 - 100000"
          required
        />
        <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
          {isRTL ? 'أدخل رقم بين 0 و 100000' : 'Enter a number between 0 and 100,000'}
        </p>
      </div>

      <div className="md:col-span-2">
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.couponDescription} *</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          rows={3}
          required
        />
      </div>

      {/* Only show company dropdown for ADMIN users */}
      {!isCompanyUser && (
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.couponCompany} *</label>
          <select
            value={formData.company_id}
            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
            required
          >
            <option value="">{t.coupons.selectCompany}</option>
            {companies.map((company: any) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.category}</label>
        <select
          value={formData.coupon_category_id}
          onChange={(e) => setFormData({ ...formData, coupon_category_id: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
        >
          <option value="">{t.coupons.selectCategory}</option>
          {categories.map((category: any) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.imageUrl}</label>
        <input
          type="url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.expirationDate}</label>
        <input
          type="date"
          value={formData.expiration_date}
          onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.maxUsagePerUser}</label>
        <input
          type="number"
          value={formData.max_usage_per_user}
          onChange={(e) => setFormData({ ...formData, max_usage_per_user: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.totalAvailable}</label>
        <input
          type="number"
          value={formData.total_available}
          onChange={(e) => setFormData({ ...formData, total_available: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.common.status}</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
        >
          <option value="ACTIVE">{t.common.active}</option>
          <option value="INACTIVE">{t.common.inactive}</option>
        </select>
      </div>
    </div>
  );
}
