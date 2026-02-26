export default function CategoryForm({ formData, setFormData, t, isRTL }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
          {t?.categories?.name || 'Category Name'} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
          required
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
          {t?.categories?.nameAr || 'Name (Arabic)'}
        </label>
        <input
          type="text"
          value={formData.name_ar}
          onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-right`}
          dir="rtl"
          placeholder="اسم الفئة بالعربي"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
          {t?.categories?.nameEn || 'Name (English)'}
        </label>
        <input
          type="text"
          value={formData.name_en}
          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent`}
          placeholder="Category name in English"
        />
      </div>

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
          {t?.categories?.nameKu || 'Name (Kurdish)'}
        </label>
        <input
          type="text"
          value={formData.name_ku}
          onChange={(e) => setFormData({ ...formData, name_ku: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-right`}
          dir="rtl"
          placeholder="ناوی پۆلەکە بە کوردی"
        />
      </div>
      
      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
          {t?.categories?.description || 'Description'}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
          rows={3}
          placeholder={isRTL ? 'وصف هذه الفئة...' : 'Describe this category...'}
        />
      </div>
    </div>
  );
}
