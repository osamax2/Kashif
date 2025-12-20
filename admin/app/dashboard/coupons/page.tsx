'use client';

import { couponsAPI } from '@/lib/api';
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
      const profile = JSON.parse(storedProfile);
      setUserProfile(profile);
      // If COMPANY user, pre-set the company_id in formData
      if (profile.role === 'COMPANY' && profile.company_id) {
        setFormData(prev => ({ ...prev, company_id: profile.company_id.toString() }));
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
    try {
      const createData: any = {
        company_id: parseInt(formData.company_id),
        name: formData.name,
        description: formData.description,
        points_cost: parseInt(formData.points_cost),
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
      alert('Coupon created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadCoupons();
    } catch (error) {
      console.error('Failed to create coupon:', error);
      alert('Failed to create coupon');
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      name: coupon.name,
      description: coupon.description,
      points_cost: coupon.points_cost.toString(),
      company_id: coupon.company_id.toString(),
      coupon_category_id: coupon.coupon_category_id.toString(),
      image_url: coupon.image_url || '',
      expiration_date: coupon.expiration_date ? coupon.expiration_date.split('T')[0] : '',
      max_usage_per_user: coupon.max_usage_per_user?.toString() || '',
      total_available: coupon.total_available?.toString() || '',
      status: coupon.status,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedCoupon) return;

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
      alert('Coupon updated successfully!');
      setShowEditModal(false);
      resetForm();
      loadCoupons();
    } catch (error) {
      console.error('Failed to update coupon:', error);
      alert('Failed to update coupon');
    }
  };

  const handleDelete = async () => {
    if (!selectedCoupon) return;
    try {
      await couponsAPI.deleteCoupon(selectedCoupon.id);
      alert('Coupon deleted successfully!');
      setShowDeleteModal(false);
      setSelectedCoupon(null);
      loadCoupons();
    } catch (error) {
      console.error('Failed to delete coupon:', error);
      alert('Failed to delete coupon');
    }
  };

  const resetForm = () => {
    // For COMPANY users, keep their company_id
    const companyId = userProfile?.role === 'COMPANY' && userProfile?.company_id 
      ? userProfile.company_id.toString() 
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
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coupons</h1>
          <p className="text-gray-600 mt-2">
            {isCompanyUser ? 'Manage your company\'s coupons' : 'Manage coupons and rewards'}
          </p>
        </div>
        <div className="flex gap-3">
          {!isCompanyUser && (
            <>
              <Link
                href="/dashboard/companies"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <Building2 className="w-5 h-5" />
                Companies
              </Link>
              <Link
                href="/dashboard/categories"
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <Tag className="w-5 h-5" />
                Categories
              </Link>
            </>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition"
          >
            <Plus className="w-5 h-5" />
            Create Coupon
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
            {coupon.image_url && (
              <img
                src={coupon.image_url}
                alt={coupon.name}
                className="w-full h-40 object-cover rounded-lg mb-4"
              />
            )}
            <h3 className="font-semibold text-gray-900 text-lg mb-2">{coupon.name}</h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{coupon.description}</p>
            <div className="flex items-center justify-between mb-3">
              <span className="text-yellow-600 font-bold">{coupon.points_cost} Points</span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                coupon.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {coupon.status}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(coupon)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  setSelectedCoupon(coupon);
                  setShowDeleteModal(true);
                }}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {coupons.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No coupons found</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Coupon</h2>
            <CouponForm 
              formData={formData} 
              setFormData={setFormData}
              companies={companies}
              categories={categories}
              isCompanyUser={isCompanyUser}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800"
              >
                Create Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCoupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Coupon</h2>
            <CouponForm 
              formData={formData} 
              setFormData={setFormData}
              companies={companies}
              categories={categories}
              isCompanyUser={isCompanyUser}
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCoupon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">Delete Coupon</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{selectedCoupon.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCoupon(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CouponForm({ formData, setFormData, companies, categories, isCompanyUser }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Points Cost *</label>
        <input
          type="number"
          value={formData.points_cost}
          onChange={(e) => setFormData({ ...formData, points_cost: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          rows={3}
          required
        />
      </div>

      {/* Only show company dropdown for ADMIN users */}
      {!isCompanyUser && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
          <select
            value={formData.company_id}
            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            required
          >
            <option value="">Select a company...</option>
            {companies.map((company: any) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select
          value={formData.coupon_category_id}
          onChange={(e) => setFormData({ ...formData, coupon_category_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
        >
          <option value="">Select a category...</option>
          {categories.map((category: any) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
        <input
          type="url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Expiration Date</label>
        <input
          type="date"
          value={formData.expiration_date}
          onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Max Usage Per User</label>
        <input
          type="number"
          value={formData.max_usage_per_user}
          onChange={(e) => setFormData({ ...formData, max_usage_per_user: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Total Available</label>
        <input
          type="number"
          value={formData.total_available}
          onChange={(e) => setFormData({ ...formData, total_available: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
        >
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>
    </div>
  );
}
