'use client';

import ImageUpload from '@/components/ImageUpload';
import { couponsAPI, getImageUrl } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { Building2, Plus, RotateCcw, Tag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Helper function to convert Arabic numerals to English and only allow digits
const sanitizeToEnglishNumbers = (value: string): string => {
  // Map Arabic numerals (٠١٢٣٤٥٦٧٨٩) to English (0-9)
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let sanitized = value;
  arabicNumerals.forEach((arabic, index) => {
    sanitized = sanitized.replaceAll(arabic, String(index));
  });
  // Remove any non-digit characters except empty string
  return sanitized.replaceAll(/\D/g, '');
};

// Helper function to determine effective coupon status based on expiration date
const getEffectiveStatus = (coupon: { status: string; expiration_date: string }): string => {
  if (coupon.status === 'INACTIVE') return 'INACTIVE';
  if (coupon.expiration_date) {
    const now = new Date();
    const expirationDate = new Date(coupon.expiration_date);
    if (expirationDate < now) return 'EXPIRED';
  }
  return coupon.status;
};

interface Coupon {
  id: number;
  company_id: number;
  coupon_category_id: number;
  name: string;
  description: string;
  points_cost: number;
  image_url?: string;
  address?: string;
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
  const [filteredCoupons, setFilteredCoupons] = useState<Coupon[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [deletedCoupons, setDeletedCoupons] = useState<Coupon[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Filter states
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_cost: '',
    company_id: '',
    coupon_category_id: '',
    image_url: '',
    address: '',
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCompanySuggestions(false);
    };
    if (showCompanySuggestions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCompanySuggestions]);

  // Filter coupons based on search query and filters
  useEffect(() => {
    let filtered = [...coupons];
    
    // Apply category filter
    if (filterCategory) {
      filtered = filtered.filter(coupon => coupon.coupon_category_id === parseInt(filterCategory));
    }
    
    // Apply company filter
    if (filterCompany) {
      filtered = filtered.filter(coupon => coupon.company_id === parseInt(filterCompany));
    }
    
    // Apply status filter (using effective status that accounts for expiration)
    if (filterStatus) {
      filtered = filtered.filter(coupon => getEffectiveStatus(coupon) === filterStatus);
    }
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(coupon => {
        const matchesName = coupon.name.toLowerCase().includes(query);
        const matchesDescription = coupon.description.toLowerCase().includes(query);
        const matchesPoints = coupon.points_cost.toString().includes(query);
        
        // Check company name
        const company = companies.find(c => c.id === coupon.company_id);
        const matchesCompany = company?.name.toLowerCase().includes(query);
        
        // Check category name
        const category = categories.find(c => c.id === coupon.coupon_category_id);
        const matchesCategory = category?.name.toLowerCase().includes(query);

        return matchesName || matchesDescription || matchesPoints || matchesCompany || matchesCategory;
      });
    }

    setFilteredCoupons(filtered);
  }, [searchQuery, coupons, companies, categories, filterCategory, filterCompany, filterStatus]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await couponsAPI.getCoupons({ limit: 1000 });
      const couponsData = Array.isArray(data) ? data : [];
      setCoupons(couponsData);
      setFilteredCoupons(couponsData);
    } catch (error) {
      console.error('Failed to load coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedCoupons = async () => {
    try {
      setTrashLoading(true);
      const companyId = isCompanyUser && userProfile?.company_id ? userProfile.company_id : undefined;
      const data = await couponsAPI.getDeletedCoupons(companyId);
      setDeletedCoupons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load deleted coupons:', error);
      setDeletedCoupons([]);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleOpenTrash = async () => {
    setShowTrashModal(true);
    await loadDeletedCoupons();
  };

  const handleRestoreCoupon = async (couponId: number) => {
    try {
      await couponsAPI.restoreCoupon(couponId);
      setDeletedCoupons(deletedCoupons.filter(c => c.id !== couponId));
      loadCoupons();
    } catch (error) {
      console.error('Failed to restore coupon:', error);
      alert(isRTL ? 'فشل في استعادة الكوبون' : 'Failed to restore coupon');
    }
  };

  const handlePermanentDelete = async (couponId: number) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to permanently delete? This action cannot be undone.')) {
      return;
    }
    try {
      await couponsAPI.permanentDeleteCoupon(couponId);
      setDeletedCoupons(deletedCoupons.filter(c => c.id !== couponId));
    } catch (error) {
      console.error('Failed to permanently delete coupon:', error);
      alert(isRTL ? 'فشل في الحذف النهائي' : 'Failed to permanently delete');
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
    // Validate required fields
    const errors: Record<string, string> = {};
    
    if (!formData.name || !formData.name.trim()) {
      errors.name = isRTL ? 'اسم الكوبون مطلوب' : 'Coupon name is required';
    }
    if (!formData.description || !formData.description.trim()) {
      errors.description = isRTL ? 'وصف الكوبون مطلوب' : 'Description is required';
    }
    if (!formData.company_id) {
      errors.company_id = isRTL ? 'الشركة مطلوبة' : 'Company is required';
    }
    if (!formData.points_cost && formData.points_cost !== '0') {
      errors.points_cost = isRTL ? 'تكلفة النقاط مطلوبة' : 'Points cost is required';
    }
    
    // Validate points_cost
    const pointsCost = parseInt(formData.points_cost);
    if (!errors.points_cost && (isNaN(pointsCost) || pointsCost < 0 || pointsCost > 100000)) {
      errors.points_cost = isRTL ? 'تكلفة النقاط يجب أن تكون بين 0 و 100000' : 'Points cost must be between 0 and 100,000';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    
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
      if (formData.address && formData.address.trim()) {
        createData.address = formData.address.trim();
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
    const company = companies.find(c => c.id === coupon.company_id);
    setSelectedCompanyName(company ? company.name : '');
    setCompanySearch(company ? company.name : '');
    setFormData({
      name: coupon.name || '',
      description: coupon.description || '',
      points_cost: coupon.points_cost != null ? String(coupon.points_cost) : '',
      company_id: coupon.company_id != null ? String(coupon.company_id) : '',
      coupon_category_id: coupon.coupon_category_id != null ? String(coupon.coupon_category_id) : '',
      image_url: coupon.image_url || '',
      address: coupon.address || '',
      expiration_date: coupon.expiration_date ? coupon.expiration_date.split('T')[0] : '',
      max_usage_per_user: coupon.max_usage_per_user != null ? String(coupon.max_usage_per_user) : '',
      total_available: coupon.total_available != null ? String(coupon.total_available) : '',
      status: coupon.status || 'ACTIVE',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedCoupon) return;

    // Validate required fields
    const errors: Record<string, string> = {};
    
    if (!formData.name || !formData.name.trim()) {
      errors.name = isRTL ? 'اسم الكوبون مطلوب' : 'Coupon name is required';
    }
    if (!formData.description || !formData.description.trim()) {
      errors.description = isRTL ? 'وصف الكوبون مطلوب' : 'Description is required';
    }
    if (!formData.company_id) {
      errors.company_id = isRTL ? 'الشركة مطلوبة' : 'Company is required';
    }
    if (!formData.points_cost && formData.points_cost !== '0') {
      errors.points_cost = isRTL ? 'تكلفة النقاط مطلوبة' : 'Points cost is required';
    }

    // Validate points_cost if provided
    if (!errors.points_cost && formData.points_cost && formData.points_cost.toString().trim()) {
      const pointsCost = parseInt(formData.points_cost);
      if (isNaN(pointsCost) || pointsCost < 0 || pointsCost > 100000) {
        errors.points_cost = isRTL ? 'تكلفة النقاط يجب أن تكون بين 0 و 100000' : 'Points cost must be between 0 and 100,000';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    try {
      const updateData: any = {};
      
      if (formData.name && formData.name.trim()) updateData.name = formData.name.trim();
      if (formData.description && formData.description.trim()) updateData.description = formData.description.trim();
      if (formData.points_cost && formData.points_cost.toString().trim()) {
        updateData.points_cost = parseInt(formData.points_cost);
      }
      // Send image_url as null when cleared, so the backend removes it
      if (formData.image_url && formData.image_url.trim()) {
        updateData.image_url = formData.image_url.trim();
      } else if (selectedCoupon.image_url && !formData.image_url) {
        // Image was removed by user
        updateData.image_url = null;
      }
      if (formData.address !== undefined) updateData.address = formData.address.trim() || null;
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
      address: '',
      expiration_date: '',
      max_usage_per_user: '',
      total_available: '',
      status: 'ACTIVE',
    });
    setCompanySearch('');
    setSelectedCompanyName('');
    setShowCompanySuggestions(false);
  };

  // Filter companies based on search
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const handleCompanySelect = (company: any) => {
    setFormData({ ...formData, company_id: String(company.id) });
    setCompanySearch(company.name);
    setSelectedCompanyName(company.name);
    setShowCompanySuggestions(false);
  };

  const handleCompanySearchChange = (value: string) => {
    setCompanySearch(value);
    setShowCompanySuggestions(true);
    // Clear company_id if search is cleared
    if (!value) {
      setFormData({ ...formData, company_id: '' });
      setSelectedCompanyName('');
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
            onClick={handleOpenTrash}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">{isRTL ? 'المحذوفات' : 'Trash'}</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setValidationErrors({});
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

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isRTL ? 'ابحث عن الكوبونات...' : 'Search coupons...'}
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
        />
      </div>

      {/* Filters */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 ${isRTL ? 'text-right' : ''}`}>
        {/* Category Filter */}
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
            {t.coupons.category || (isRTL ? 'الفئة' : 'Category')}
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          >
            <option value="">{isRTL ? 'كل الفئات' : 'All Categories'}</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Company Filter - Only for ADMIN */}
        {!isCompanyUser && (
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
              {t.coupons.couponCompany || (isRTL ? 'الشركة' : 'Company')}
            </label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
            >
              <option value="">{isRTL ? 'كل الشركات' : 'All Companies'}</option>
              {companies.map((comp: any) => (
                <option key={comp.id} value={comp.id}>{comp.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div>
          <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
            {t.common.status || (isRTL ? 'الحالة' : 'Status')}
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          >
            <option value="">{isRTL ? 'كل الحالات' : 'All Status'}</option>
            <option value="ACTIVE">{t.common.active || (isRTL ? 'نشط' : 'Active')}</option>
            <option value="INACTIVE">{t.common.inactive || (isRTL ? 'غير نشط' : 'Inactive')}</option>
            <option value="EXPIRED">{t.common.expired || (isRTL ? 'منتهي الصلاحية' : 'Expired')}</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || filterCategory || filterCompany || filterStatus) && (
        <div className={`mb-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <p className="text-sm text-gray-500">
            {isRTL 
              ? `تم العثور على ${filteredCoupons.length} من ${coupons.length} كوبون`
              : `Found ${filteredCoupons.length} of ${coupons.length} coupons`
            }
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCategory('');
              setFilterCompany('');
              setFilterStatus('');
            }}
            className="text-sm text-primary hover:underline"
          >
            {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredCoupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition">
            {coupon.image_url && (
              <img
                src={getImageUrl(coupon.image_url)}
                alt={coupon.name}
                className="w-full h-40 object-cover rounded-lg mb-4"
              />
            )}
            <h3 className={`font-semibold text-gray-900 text-lg mb-2 ${isRTL ? 'text-right' : ''}`}>{coupon.name}</h3>
            <p className={`text-gray-600 text-sm mb-3 line-clamp-2 ${isRTL ? 'text-right' : ''}`}>{coupon.description}</p>
            <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-yellow-600 font-bold">{coupon.points_cost} {t.coupons.points}</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                getEffectiveStatus(coupon) === 'ACTIVE' 
                  ? 'bg-green-100 text-green-700' 
                  : getEffectiveStatus(coupon) === 'EXPIRED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
              }`}>
                {getEffectiveStatus(coupon) === 'ACTIVE' 
                  ? (t.common.active || 'Active')
                  : getEffectiveStatus(coupon) === 'EXPIRED'
                    ? (t.common.expired || 'Expired')
                    : (t.common.inactive || 'Inactive')}
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

      {filteredCoupons.length === 0 && coupons.length > 0 && (searchQuery || filterCategory || filterCompany || filterStatus) && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {isRTL ? 'لم يتم العثور على كوبونات مطابقة للفلاتر' : 'No coupons found matching your filters'}
          </p>
        </div>
      )}

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
              companySearch={companySearch}
              setCompanySearch={setCompanySearch}
              showCompanySuggestions={showCompanySuggestions}
              setShowCompanySuggestions={setShowCompanySuggestions}
              filteredCompanies={filteredCompanies}
              handleCompanySelect={handleCompanySelect}
              handleCompanySearchChange={handleCompanySearchChange}
              validationErrors={validationErrors}
              setValidationErrors={setValidationErrors}
            />
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                  setValidationErrors({});
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
              companySearch={companySearch}
              setCompanySearch={setCompanySearch}
              showCompanySuggestions={showCompanySuggestions}
              setShowCompanySuggestions={setShowCompanySuggestions}
              filteredCompanies={filteredCompanies}
              handleCompanySelect={handleCompanySelect}
              handleCompanySearchChange={handleCompanySearchChange}
              validationErrors={validationErrors}
              setValidationErrors={setValidationErrors}
            />
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                  setValidationErrors({});
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

      {/* Trash Modal */}
      {showTrashModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={`flex justify-between items-center mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className={`text-xl font-bold text-gray-900 ${isRTL ? 'text-right' : ''}`}>
                {isRTL ? 'الكوبونات المحذوفة' : 'Deleted Coupons'}
              </h2>
              <button
                onClick={() => setShowTrashModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {trashLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : deletedCoupons.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>{isRTL ? 'لا توجد كوبونات محذوفة' : 'No deleted coupons'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deletedCoupons.map((coupon) => {
                    const company = companies.find(c => c.id === coupon.company_id);
                    const category = categories.find(c => c.id === coupon.coupon_category_id);
                    return (
                      <div key={coupon.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className={`flex justify-between items-start mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div>
                            <h3 className={`font-semibold text-gray-900 ${isRTL ? 'text-right' : ''}`}>{coupon.name}</h3>
                            <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                              {company?.name || '-'} • {category?.name || '-'}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-primary">{coupon.points_cost} pts</span>
                        </div>
                        <p className={`text-sm text-gray-600 mb-3 line-clamp-2 ${isRTL ? 'text-right' : ''}`}>
                          {coupon.description}
                        </p>
                        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={() => handleRestoreCoupon(coupon.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                          >
                            <RotateCcw className="w-4 h-4" />
                            {isRTL ? 'استعادة' : 'Restore'}
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(coupon.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            {isRTL ? 'حذف نهائي' : 'Delete Forever'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CouponForm({ 
  formData, 
  setFormData, 
  companies, 
  categories, 
  isCompanyUser, 
  t, 
  isRTL,
  companySearch,
  setCompanySearch,
  showCompanySuggestions,
  setShowCompanySuggestions,
  filteredCompanies,
  handleCompanySelect,
  handleCompanySearchChange,
  validationErrors = {},
  setValidationErrors,
}: any) {
  // Clear specific error when user types
  const clearError = (field: string) => {
    if (validationErrors[field] && setValidationErrors) {
      setValidationErrors((prev: Record<string, string>) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.couponName} *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => { setFormData({ ...formData, name: e.target.value }); clearError('name'); }}
          className={`w-full px-3 py-2 border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          required
        />
        {validationErrors.name && <p className={`text-sm text-red-600 mt-1 ${isRTL ? 'text-right' : ''}`}>{validationErrors.name}</p>}
      </div>
      
      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.pointsCost} *</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={formData.points_cost}
          onChange={(e) => {
            const sanitizedValue = sanitizeToEnglishNumbers(e.target.value);
            const numValue = parseInt(sanitizedValue) || 0;
            if (sanitizedValue === '' || (numValue >= 0 && numValue <= 100000)) {
              setFormData({ ...formData, points_cost: sanitizedValue });
            }
            clearError('points_cost');
          }}
          className={`w-full px-3 py-2 border ${validationErrors.points_cost ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          placeholder="0 - 100000"
          required
        />
        {validationErrors.points_cost 
          ? <p className={`text-sm text-red-600 mt-1 ${isRTL ? 'text-right' : ''}`}>{validationErrors.points_cost}</p>
          : <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'أدخل رقم بين 0 و 100000 (أرقام إنجليزية فقط)' : 'Enter a number between 0 and 100,000 (English numbers only)'}
            </p>
        }
      </div>

      <div className="md:col-span-2">
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.couponDescription} *</label>
        <textarea
          value={formData.description}
          onChange={(e) => { setFormData({ ...formData, description: e.target.value }); clearError('description'); }}
          className={`w-full px-3 py-2 border ${validationErrors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          rows={3}
          required
        />
        {validationErrors.description && <p className={`text-sm text-red-600 mt-1 ${isRTL ? 'text-right' : ''}`}>{validationErrors.description}</p>}
      </div>

      {/* Only show company search for ADMIN users */}
      {!isCompanyUser && (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.couponCompany} *</label>
          <input
            type="text"
            value={companySearch}
            onChange={(e) => { handleCompanySearchChange(e.target.value); clearError('company_id'); }}
            onFocus={() => setShowCompanySuggestions(true)}
            placeholder={isRTL ? 'ابحث عن شركة...' : 'Search for a company...'}
            className={`w-full px-3 py-2 border ${validationErrors.company_id ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
            required
          />
          {validationErrors.company_id && <p className={`text-sm text-red-600 mt-1 ${isRTL ? 'text-right' : ''}`}>{validationErrors.company_id}</p>}
          {showCompanySuggestions && companySearch && filteredCompanies.length > 0 && (
            <div className={`absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto ${isRTL ? 'text-right' : ''}`}>
              {filteredCompanies.map((company: any) => (
                <div
                  key={company.id}
                  onClick={() => handleCompanySelect(company)}
                  className={`px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{company.name}</span>
                </div>
              ))}
            </div>
          )}
          {companySearch && filteredCompanies.length === 0 && showCompanySuggestions && (
            <div className={`absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-2 text-gray-500 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'لم يتم العثور على شركات' : 'No companies found'}
            </div>
          )}
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
        <ImageUpload
          value={formData.image_url || ''}
          onChange={(url) => setFormData({ ...formData, image_url: url })}
          label={t.coupons.imageUrl}
          isRTL={isRTL}
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

      <div className="md:col-span-2">
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.address || (isRTL ? 'العنوان' : 'Address')}</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          placeholder={isRTL ? 'أدخل عنوان موقع الكوبون' : 'Enter coupon location address'}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.maxUsagePerUser}</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={formData.max_usage_per_user}
          onChange={(e) => {
            const sanitizedValue = sanitizeToEnglishNumbers(e.target.value);
            setFormData({ ...formData, max_usage_per_user: sanitizedValue });
          }}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          placeholder={isRTL ? 'أرقام إنجليزية فقط' : 'English numbers only'}
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{t.coupons.totalAvailable}</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={formData.total_available}
          onChange={(e) => {
            const sanitizedValue = sanitizeToEnglishNumbers(e.target.value);
            setFormData({ ...formData, total_available: sanitizedValue });
          }}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary ${isRTL ? 'text-right' : ''}`}
          placeholder={isRTL ? 'أرقام إنجليزية فقط' : 'English numbers only'}
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
