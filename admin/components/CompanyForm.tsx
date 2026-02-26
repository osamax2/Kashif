import { useState } from 'react';
import ImageUpload from './ImageUpload';

export default function CompanyForm({ formData, setFormData, t, isRTL, language }: any) {
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const nameError = touched.name && !formData.name?.trim();
    const emailError = touched.email && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    const phoneError = touched.phone && formData.phone && !/^[+]?[\d\s()-]{6,20}$/.test(formData.phone);

    return (
        <div className="space-y-4">
            <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                    {t?.companies?.name || (
                        language === 'ar'
                            ? 'اسم الشركة'
                            : language === 'ku'
                                ? 'Navê Pargîdaniyê'
                                : 'Company Name'
                    )} *
                </label>

                <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    onBlur={() => setTouched({ ...touched, name: true })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''} ${nameError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    required
                />

                {nameError && (
                    <p className={`text-xs text-red-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
                        {language === 'ar'
                            ? 'اسم الشركة مطلوب'
                            : language === 'ku'
                                ? 'Navê pargîdaniyê pêdivî ye'
                                : 'Company name is required'}
                    </p>
                )}
            </div>

            <ImageUpload
                value={formData.logo_url || ''}
                onChange={(url) => setFormData({ ...formData, logo_url: url })}
                label={t?.companies?.logoUrl || (
                    language === 'ar'
                        ? 'رابط الشعار'
                        : language === 'ku'
                            ? 'URL-ya Logoyê'
                            : 'Logo URL'
                )}
                isRTL={isRTL}
            />

            <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                    {language === 'ar'
                        ? 'رقم الهاتف'
                        : language === 'ku'
                            ? 'Hejmara Telefonê'
                            : 'Phone Number'}
                </label>

                <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    onBlur={() => setTouched({ ...touched, phone: true })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''} ${phoneError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder={
                        language === 'ar'
                            ? 'مثال: +966501234567'
                            : language === 'ku'
                                ? 'Nîmona: +966501234567'
                                : 'e.g., +966501234567'
                    }
                />

                {phoneError && (
                    <p className={`text-xs text-red-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
                        {language === 'ar'
                            ? 'رقم الهاتف غير صالح'
                            : language === 'ku'
                                ? 'Hejmara telefonê nederbasdar e'
                                : 'Invalid phone number'}
                    </p>
                )}
            </div>

            <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                    {language === 'ar'
                        ? 'البريد الإلكتروني'
                        : language === 'ku'
                            ? 'E-name'
                            : 'Email Address'}
                </label>

                <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onBlur={() => setTouched({ ...touched, email: true })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''} ${emailError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    placeholder={
                        language === 'ar'
                            ? 'مثال: info@company.com'
                            : language === 'ku'
                                ? 'Nîmona: info@company.com'
                                : 'e.g., info@company.com'
                    }
                />

                {emailError && (
                    <p className={`text-xs text-red-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
                        {language === 'ar'
                            ? 'البريد الإلكتروني غير صالح'
                            : language === 'ku'
                                ? 'E-name nederbasdar e'
                                : 'Invalid email address'}
                    </p>
                )}
            </div>

            <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                    {language === 'ar'
                        ? 'العنوان'
                        : language === 'ku'
                            ? 'Navnîşan'
                            : 'Address'}
                </label>

                <textarea
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                    rows={2}
                    placeholder={
                        language === 'ar'
                            ? 'عنوان الشركة الكامل'
                            : language === 'ku'
                                ? 'Navnîşana tevahî ya pargîdaniyê'
                                : 'Full company address'
                    }
                />
            </div>

            <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                    {language === 'ar'
                        ? 'الحد الأقصى للمستخدمين'
                        : language === 'ku'
                            ? 'Hejmara herî zêde ya bikarhêneran'
                            : 'Max Users'}
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
                    {language === 'ar'
                        ? 'عدد المستخدمين الذين يمكن للشركة إضافتهم'
                        : language === 'ku'
                            ? 'Hejmara bikarhênerên ku pargîdanî dikare zêde bike'
                            : 'Number of users the company can add'}
                </p>
            </div>

            <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : ''}`}>
                    {t?.common?.status || (
                        language === 'ar'
                            ? 'الحالة'
                            : language === 'ku'
                                ? 'Rewş'
                                : 'Status'
                    )}
                </label>

                <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isRTL ? 'text-right' : ''}`}
                >
                    <option value="ACTIVE">
                        {t?.common?.active || (
                            language === 'ar'
                                ? 'نشط'
                                : language === 'ku'
                                    ? 'Çalak'
                                    : 'Active'
                        )}
                    </option>
                    <option value="INACTIVE">
                        {t?.common?.inactive || (
                            language === 'ar'
                                ? 'غير نشط'
                                : language === 'ku'
                                    ? 'Neçalak'
                                    : 'Inactive'
                        )}
                    </option>
                </select>
            </div>
        </div>
    );
}