import ImageUpload from './ImageUpload';

export default function CompanyForm({ formData, setFormData, t, isRTL }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
          {t?.companies?.name || 'Company Name'} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
          required
        />
      </div>
      
      <ImageUpload
        value={formData.logo_url || ''}
        onChange={(url) => setFormData({ ...formData, logo_url: url })}
        label={t?.companies?.logoUrl || 'Logo URL'}
        isRTL={isRTL}
      />

      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
          {isRTL ? 'الحد الأقصى للمستخدمين' : 'Max Users'}
        </label>
        <input
          type="number"
          min="1"
          max="1000"
          value={formData.max_users || 5}
          onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 5 })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
        />
        <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
          {isRTL ? 'عدد المستخدمين الذين يمكن للشركة إضافتهم' : 'Number of users the company can add'}
        </p>
      </div>
      
      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
          {t?.common?.status || 'Status'}
        </label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
        >
          <option value="ACTIVE">{t?.common?.active || 'Active'}</option>
          <option value="INACTIVE">{t?.common?.inactive || 'Inactive'}</option>
        </select>
      </div>
    </div>
  );
}
