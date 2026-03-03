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
  name_en?: string;
  name_ku?: string;
  color?: string;
  description?: string;
  created_at: string;
}

// Predefined color palette for easy selection
const COLOR_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#78716C', // Stone
  '#6B7280', // Gray
  '#1F2937', // Dark
];

export default function ReportCategoriesPage() {
  const router = useRouter();
  const {t, isRTL, language} = useLanguage();
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
    name_en: '',
    name_ku: '',
    color: '#3B82F6',
    description: '',
  });
  const [showColorPicker, setShowColorPicker] = useState(false);

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
    setFormData({ name: '', name_ar: '', name_en: '', name_ku: '', color: '#3B82F6', description: '' });
    setSelectedCategory(null);
    setShowColorPicker(false);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert(language === 'ar' ? 'يرجى إدخال اسم الفئة' : language === 'ku' ? 'Ji kerema xwe navê kategoriyê binivîse' : 'Please enter category name');
      return;
    }
    try {
      setSaving(true);
      await reportsAPI.createCategory(formData);
      alert(language === 'ar' ? 'تم إنشاء الفئة بنجاح!' : language === 'ku' ? 'Kategori bi serkeftin hate Çêkirin!' : 'Category created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert(language === 'ar' ? 'فشل في إنشاء الفئة' : language === 'ku' ? 'Çêkirina kategoriye têk çû' : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: ReportCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      name_ar: category.name_ar || '',
      name_en: category.name_en || '',
      name_ku: category.name_ku || '',
      color: category.color || '#3B82F6',
      description: category.description || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedCategory || !formData.name.trim()) return;
    try {
      setSaving(true);
      await reportsAPI.updateCategory(selectedCategory.id, formData);
      alert(language === 'ar' ? 'تم تحديث الفئة بنجاح!' : language === 'ku' ? 'Kategori bi serkeftin hate nûvekirin!!' : 'Category updated successfully!');
      setShowEditModal(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
      alert(language === 'ar' ? 'فشل في تحديث الفئة' : language === 'ku' ? 'Nûvekirina kategoriyê bi ser neket' : 'Failed to update category');
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
      alert(language === 'ar' ? 'تم حذف الفئة بنجاح!' : language === 'ku' ? 'Kategori bi serkeftin hate jêbirin!' : 'Category deleted successfully!');
      setShowDeleteModal(false);
      setSelectedCategory(null);
      loadCategories();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      const detail = error?.response?.data?.detail;
      if (detail && detail.includes('report')) {
        alert(language === 'ar' ? 'لا يمكن حذف الفئة لأنها تحتوي على بلاغات. أعد تعيينها أولاً.' : language === 'ku' ? `Kategori nayê jêbirin çinkî rapor têde hene. Berî her tiştî wê vegerîne..: ${detail}` : `Cannot delete: ${detail}`);
      } else {
        alert(language === 'ar' ? 'فشل في حذف الفئة' : language === 'ku' ? 'Jêbirina kategoriyê bi ser neket' : 'Failed to delete category');
      }
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
                {language === 'ar' ? 'فئات البلاغات' : language === 'ku' ? 'Kategoriyên Raporan' : 'Report Categories'}
              </h1>
              <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                {language === 'ar' ? 'إدارة فئات البلاغات' : language === 'ku' ? 'Rêveberiya kategoriyên raporan' : 'Manage report categories'}
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
            <span>{language === 'ar' ? 'إضافة فئة' : language === 'ku' ? 'Kategoriya nû zêde bike' : 'Add Category'}</span>
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
                  {language === 'ar' ? 'الاسم (إنجليزي)' : language === 'ku' ? 'Nav (English)' : 'Name (English)'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'الاسم (عربي)' : language === 'ku' ? 'Nav (Erebî)' : 'Name (Arabic)'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'الاسم (كردي)' : language === 'ku' ? 'Nav (Kurdî)' : 'Name (Kurdish)'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'اللون' : language === 'ku' ? 'Reng' : 'Color'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'الوصف' : language === 'ku' ? 'Danasîn' : 'Description'}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'ar' ? 'الإجراءات' : language === 'ku' ? 'Çalakî' : 'Actions'}
                </th>
              </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
              {categories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {language === 'ar' ? 'لا توجد فئات' : language === 'ku' ? 'Tu kategori nehat dîtin' : 'No categories found'}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {category.name_ku || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {category.color ? (
                              <div className="flex items-center gap-2">
                                <div
                                    className="w-6 h-6 rounded-full border border-gray-300 shadow-sm"
                                    style={{ backgroundColor: category.color }}
                                />
                                <span className="text-xs text-gray-500 font-mono">{category.color}</span>
                              </div>
                          ) : (
                              <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {category.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button
                                onClick={() => handleEdit(category)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title={language === 'ar' ? 'تعديل' : language === 'ku' ? 'Biguherîne' : 'Edit'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(category)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title={language === 'ar' ? 'حذف' : language === 'ku' ? 'Jê bibe' : 'Delete'}
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
                  {language === 'ar' ? 'إضافة فئة جديدة' : language === 'ku' ? 'Kategoriya nû zêde bike' : 'Add New Category'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'الاسم (إنجليزي) *' : language === 'ku' ? 'Nav(English) *' : 'Name (English) *'}
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                        placeholder={language === 'ar' ? 'مثال: Pothole' : language === 'ku' ? 'Nîmona: Pothole' : 'e.g., Pothole'}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'الاسم (عربي)' : language === 'ku' ? 'Nav (Erebî)' : 'Name (Arabic)'}
                    </label>
                    <input
                        type="text"
                        value={formData.name_ar}
                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                        placeholder={language === 'ar' ? 'مثال: حفرة' : language === 'ku' ? 'Nîmona: حفرة' : 'e.g., حفرة'}
                        dir="rtl"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'الاسم (كردي)' : language === 'ku' ? 'Nav (Kurdî)' : 'Name (Kurdish)'}
                    </label>
                    <input
                        type="text"
                        value={formData.name_ku}
                        onChange={(e) => setFormData({ ...formData, name_ku: e.target.value })}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                        placeholder={language === 'ar' ? 'اسم الفئة بالكردي' : language === 'ku' ? 'Nîmona: Çalêk ' : 'e.g., Navê kategoriyê bi Kurdî'}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'اللون' : language === 'ku' ? 'Reng' : 'Color'}
                    </label>
                    <div className="space-y-3">
                      {/* Color preview and manual input */}
                      <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-sm cursor-pointer"
                            style={{ backgroundColor: formData.color }}
                            onClick={() => setShowColorPicker(!showColorPicker)}
                        />
                        <input
                            type="text"
                            value={formData.color}
                            onChange={(e) => {
                              let value = e.target.value;
                              if (!value.startsWith('#')) value = '#' + value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                setFormData({ ...formData, color: value.toUpperCase() });
                              }
                            }}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                            placeholder="#3B82F6"
                            maxLength={7}
                        />
                        <button
                            type="button"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                          {showColorPicker ? (language === 'ar' ? 'إخفاء' : language === 'ku' ? 'Veşêre' : 'Hide') : (language === 'ar' ? 'اختيار' : language === 'ku' ? 'Hilbijêre' : 'Pick')}
                        </button>
                      </div>
                      {/* Color palette */}
                      {showColorPicker && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-10 gap-1.5">
                              {COLOR_PALETTE.map((color) => (
                                  <button
                                      key={color}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, color });
                                        setShowColorPicker(false);
                                      }}
                                      className={`w-6 h-6 rounded-md border-2 transition hover:scale-110 ${formData.color === color ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-400' : 'border-transparent'}`}
                                      style={{ backgroundColor: color }}
                                      title={color}
                                  />
                              ))}
                            </div>
                          </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'الوصف' : language === 'ku' ? 'Danasîn' : 'Description'}
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                        rows={3}
                        placeholder={language === 'ar' ? 'وصف الفئة...' : language === 'ku' ? 'Danasîna kategoriyê...' : 'Category description...'}
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
                    {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                  </button>
                  <button
                      onClick={handleCreate}
                      disabled={saving || !formData.name.trim()}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {saving ? (language === 'ar' ? 'جاري الحفظ...' : language === 'ku' ? 'Tê tomar kirin...' : 'Saving...') : (language === 'ar' ? 'إضافة' : language === 'ku' ? 'Zêde bike' : 'Add')}
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
                  {language === 'ar' ? 'تعديل الفئة' : language === 'ku' ? 'Kategoriyê biguherîne' : 'Edit Category'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'الاسم (إنجليزي) *' : language === 'ku' ? 'Nav (English) *' : 'Name (English) *'}
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
                      {language === 'ar' ? 'الاسم (عربي)' : language === 'ku' ? 'Nav (Erebî)' : 'Name (Arabic)'}
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
                      {language === 'ar' ? 'الاسم (كردي)' : language === 'ku' ? 'Nav (Kurdî)' : 'Name (Kurdish)'}
                    </label>
                    <input
                        type="text"
                        value={formData.name_ku}
                        onChange={(e) => setFormData({ ...formData, name_ku: e.target.value })}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'اللون' : language === 'ku' ? 'Reng' : 'Color'}
                    </label>
                    <div className="space-y-3">
                      {/* Color preview and manual input */}
                      <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg border-2 border-gray-300 shadow-sm cursor-pointer"
                            style={{ backgroundColor: formData.color }}
                            onClick={() => setShowColorPicker(!showColorPicker)}
                        />
                        <input
                            type="text"
                            value={formData.color}
                            onChange={(e) => {
                              let value = e.target.value;
                              if (!value.startsWith('#')) value = '#' + value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                setFormData({ ...formData, color: value.toUpperCase() });
                              }
                            }}
                            className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            placeholder="#3B82F6"
                            maxLength={7}
                        />
                        <button
                            type="button"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                          {showColorPicker ? (language === 'ar' ? 'إخفاء' : language === 'ku' ? 'Veşêre' : 'Hide') : (language === 'ar' ? 'اختيار' : language === 'ku' ? 'Pick' : 'Pick')}
                        </button>
                      </div>
                      {/* Color palette */}
                      {showColorPicker && (
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-10 gap-1.5">
                              {COLOR_PALETTE.map((color) => (
                                  <button
                                      key={color}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, color });
                                        setShowColorPicker(false);
                                      }}
                                      className={`w-6 h-6 rounded-md border-2 transition hover:scale-110 ${formData.color === color ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-400' : 'border-transparent'}`}
                                      style={{ backgroundColor: color }}
                                      title={color}
                                  />
                              ))}
                            </div>
                          </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                      {language === 'ar' ? 'الوصف' : language === 'ku' ? 'Danasîn' : 'Description'}
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
                    {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                  </button>
                  <button
                      onClick={handleUpdate}
                      disabled={saving || !formData.name.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {saving ? (language === 'ar' ? 'جاري الحفظ...' : language === 'ku' ? 'Tê tomar kirin...' : 'Saving...') : (language === 'ar' ? 'حفظ' : language === 'ku' ? 'Tomar bike' : 'Save')}
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
                  {language === 'ar' ? 'تأكيد الحذف' : language === 'ku' ? 'Jêbirinê piştrast bike' : 'Confirm Delete'}
                </h2>
                <p className={`text-gray-600 mb-6 ${isRTL ? 'text-right' : ''}`}>
                  {language === 'ar' ? `هل أنت متأكد من حذف الفئة "${selectedCategory.name_ar || selectedCategory.name}"؟` : language === 'ku' ? `Tu bi rastî dixwazî kategoriyê  "${selectedCategory.name}"jê bibî?` : `Are you sure you want to delete the category "${selectedCategory.name}"?`}
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                  <p className={`text-yellow-800 text-sm ${isRTL ? 'text-right' : ''}`}>
                    {language === 'ar' ? '⚠️ تحذير: البلاغات المرتبطة بهذه الفئة قد تتأثر.' : language === 'ku' ? '⚠️ Hişyari: Raporên girêdayî vê kategoriyê dikarin were bandor kirin.' : '⚠️ Warning: Reports associated with this category may be affected.'}
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
                    {language === 'ar' ? 'إلغاء' : language === 'ku' ? 'Betal bike' : 'Cancel'}
                  </button>
                  <button
                      onClick={handleDelete}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {saving ? (language === 'ar' ? 'جاري الحذف...' : language === 'ku' ? 'Tê jêbirin...' : 'Deleting...') : (language === 'ar' ? 'حذف' : language === 'ku' ? 'Jebibe' : 'Delete')}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
