'use client';

import CategoryForm from '@/components/CategoryForm';
import { couponsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Category {
  id: number;
  name: string;
  description?: string;
  status: string;
  created_at: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await couponsAPI.getCategories();
      // Filter out deleted categories
      const activeCategories = Array.isArray(data) 
        ? data.filter(cat => cat.status !== 'DELETED') 
        : [];
      setCategories(activeCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }
    try {
      await couponsAPI.createCategory(formData);
      alert('Category created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadCategories();
    } catch (error: any) {
      console.error('Failed to create category:', error);
      const msg = error?.response?.data?.detail || 'Failed to create category';
      alert(msg);
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedCategory) return;
    try {
      await couponsAPI.updateCategory(selectedCategory.id, formData);
      alert('Category updated successfully!');
      setShowEditModal(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('Failed to update category');
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      await couponsAPI.deleteCategory(selectedCategory.id);
      alert('Category deleted successfully!');
      setShowDeleteModal(false);
      setSelectedCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
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
          <button
            onClick={() => router.push('/dashboard/coupons')}
            className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 sm:mb-3 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t.common.back} {t.nav.coupons}
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t.categories.title}</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">{isRTL ? 'إدارة فئات القسائم' : 'Manage coupon categories'}</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 transition text-sm sm:text-base w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-5 h-5" />
          {t.categories.addCategory}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 hover:shadow-md transition">
            <h3 className={`font-semibold text-gray-900 text-base sm:text-lg mb-2 ${isRTL ? 'text-right' : ''}`}>{category.name}</h3>
            {category.description && (
              <p className={`text-gray-600 text-xs sm:text-sm mb-3 ${isRTL ? 'text-right' : ''}`}>{category.description}</p>
            )}
            <div className={`flex flex-col xs:flex-row gap-2 mt-4 ${isRTL ? 'xs:flex-row-reverse' : ''}`}>
              <button
                onClick={() => handleEdit(category)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition"
              >
                {t.common.edit}
              </button>
              <button
                onClick={() => {
                  setSelectedCategory(category);
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

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">{isRTL ? 'لم يتم العثور على فئات' : 'No categories found'}</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>{t.categories.addCategory}</h2>
            <CategoryForm formData={formData} setFormData={setFormData} t={t} isRTL={isRTL} />
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
                {t.categories.addCategory}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>{t.categories.editCategory}</h2>
            <CategoryForm formData={formData} setFormData={setFormData} t={t} isRTL={isRTL} />
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
      {showDeleteModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
            <h2 className={`text-xl font-bold text-red-600 mb-4 ${isRTL ? 'text-right' : ''}`}>{t.categories.deleteCategory}</h2>
            <p className={`text-gray-700 mb-6 ${isRTL ? 'text-right' : ''}`}>
              {t.categories.confirmDelete} <strong>{selectedCategory.name}</strong>?
            </p>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCategory(null);
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
