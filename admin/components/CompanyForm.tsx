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
      
      <div>
        <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
          {t?.companies?.logoUrl || 'Logo URL'}
        </label>
        <input
          type="url"
          value={formData.logo_url}
          onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
          placeholder="https://example.com/logo.png"
          dir="ltr"
        />
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
