'use client';

import { reportsAPI } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { ArrowLeft, Edit2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ReportCategory {
  id: number;
  name: string;
  name_ar?: string;
  description?: string;
  created_at: string;
}

export default function ReportCategoriesPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await reportsAPI.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', name_ar: '', description: '' });
    setSelectedCategory(null);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert(isRTL ? 'يرجى إدخال اسم الفئة' : 'Please enter category name');
      return;
    }
    try {
      setSaving(true);
      await reportsAPI.createCategory(formData);
      alert(isRTL ? 'تم إنشاء الفئة بنجاح!' : 'Category created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert(isRTL ? 'فشل في إنشاء الفئة' : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: ReportCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      name_ar: category.name_ar || '',
      description: category.description || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedCategory || !formData.name.trim()) return;
    try {
      setSaving(true);
      await reportsAPI.updateCategory(selectedCategory.id, formData);
      alert(isRTL ? 'تم تحديث الفئة بنجاح!' : 'Category updated successfully!');
      setShowEditModal(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
      alert(isRTL ? 'فشل في تحديث الفئة' : 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (category: ReportCategory) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      setSaving(true);
      await reportsAPI.deleteCategory(selectedCategory.id);
      alert(isRTL ? 'تم حذف الفئة بنجاح!' : 'Category deleted successfully!');
      setShowDeleteModal(false);
      setSelectedCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(isRTL ? 'فشل في حذف الفئة' : 'Failed to delete category');
    } finally {
      setSaving(false);
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
      {/* Header */}
      <div className={`mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => router.push('/dashboard/reports')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className={`w-6 h-6 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className={isRTL ? 'text-right' : ''}>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isRTL ? 'فئات البلاغات' : 'Report Categories'}
            </h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
              {isRTL ? 'إدارة فئات البلاغات' : 'Manage report categories'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className={`flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-5 h-5" />
          <span>{isRTL ? 'إضافة فئة' : 'Add Category'}</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  ID
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الوصف' : 'Description'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'الإجراءات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    {isRTL ? 'لا توجد فئات' : 'No categories found'}
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {category.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {category.name_ar || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {category.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title={isRTL ? 'تعديل' : 'Edit'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(category)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title={isRTL ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'إضافة فئة جديدة' : 'Add New Category'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'الاسم (إنجليزي) *' : 'Name (English) *'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? 'مثال: Pothole' : 'e.g., Pothole'}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                  placeholder={isRTL ? 'مثال: حفرة' : 'e.g., حفرة'}
                  dir="rtl"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                  rows={3}
                  placeholder={isRTL ? 'وصف الفئة...' : 'Category description...'}
                />
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={saving}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.name.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'إضافة' : 'Add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'تعديل الفئة' : 'Edit Category'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'الاسم (إنجليزي) *' : 'Name (English) *'}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                  dir="rtl"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                  {isRTL ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                  rows={3}
                />
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={saving}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving || !formData.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className={`text-xl font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h2>
            <p className={`text-gray-600 mb-6 ${isRTL ? 'text-right' : ''}`}>
              {isRTL 
                ? `هل أنت متأكد من حذف الفئة "${selectedCategory.name_ar || selectedCategory.name}"؟`
                : `Are you sure you want to delete the category "${selectedCategory.name}"?`}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <p className={`text-yellow-800 text-sm ${isRTL ? 'text-right' : ''}`}>
                {isRTL 
                  ? '⚠️ تحذير: البلاغات المرتبطة بهذه الفئة قد تتأثر.'
                  : '⚠️ Warning: Reports associated with this category may be affected.'}
              </p>
            </div>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCategory(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={saving}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {saving ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'حذف' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
