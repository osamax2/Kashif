'use client';

import { useState } from 'react';

export default function DeleteAccountPage() {
  const [language, setLanguage] = useState('en');
  const isRTL = language === 'ar';

  return (
      <div
          className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
          dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">

          {/* Language Switcher */}
          <div className="flex justify-end mb-4">
            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="ku">Kurdî</option>
            </select>
          </div>

          {/* TITLE */}
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            {language === 'ku'
                ? 'Jêbirina Hesabê'
                : language === 'en'
                    ? 'Delete Account'
                    : 'حذف الحساب'}
          </h1>

          <div className="prose prose-lg max-w-none">

            {/* SECTION 1 */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {language === 'ku'
                    ? 'Çawa daxwaza jêbirina hesabê xwe bikin'
                    : language === 'en'
                        ? 'How to Request Account Deletion'
                        : 'كيفية طلب حذف حسابك'}
              </h2>

              <p>
                {language === 'ku'
                    ? 'Em mafê te yê jêbirina daneyên kesane rêz dikin. Ji bo daxwaza jêbirina hesabê xwe û hemû daneyên girêdayî bi wê, ji kerema xwe van gavên jêrîn bişopînin:'
                    : language === 'en'
                        ? 'We respect your right to delete your personal data. To request deletion of your account and all associated data in the Kashif Road Safety application, please follow the steps below:'
                        : 'نحترم حقك في حذف بياناتك الشخصية. لطلب حذف حسابك وجميع البيانات المرتبطة به في تطبيق كاشف للسلامة على الطرق، يرجى اتباع الخطوات التالية:'}
              </p>
            </section>

            {/* STEPS */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {language === 'ku'
                    ? 'Gavên jêbirinê'
                    : language === 'en'
                        ? 'Deletion Steps'
                        : 'خطوات الحذف'}
              </h2>

              <ol className="list-decimal list-inside space-y-3">
                <li>
                  {language === 'ku'
                      ? 'E-nameyek bişîne bo:'
                      : language === 'en'
                          ? 'Send an email to:'
                          : 'أرسل بريدًا إلكترونيًا إلى:'}{' '}
                  <a
                      href="mailto:contact@kashifroad.com"
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    contact@kashifroad.com
                  </a>
                </li>

                <li>
                  {language === 'ku'
                      ? 'Di sernavê peyamê de binivîse: "Daxwaza Jêbirina Hesabê"'
                      : language === 'en'
                          ? 'Write in the subject line: "Delete Account Request"'
                          : 'اكتب في موضوع الرسالة: "طلب حذف الحساب" أو "Delete Account Request"'}
                </li>
              </ol>
            </section>

            {/* DATA DELETED */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {language === 'ku'
                    ? 'Daneyên ku dê bên jêbirin'
                    : language === 'en'
                        ? 'Data That Will Be Deleted'
                        : 'البيانات التي سيتم حذفها'}
              </h2>

              <ul className="list-disc list-inside space-y-2">
                {language === 'ku' ? (
                    <>
                      <li>Agahiyên hesabê (e-name, nav, şîfre)</li>
                      <li>Xal û serkeftin</li>
                      <li>Tokenên push</li>
                      <li>Mîheng û tercîhên bikarhêner</li>
                      <li>Tomara çalakiyên kesane</li>
                    </>
                ) : language === 'en' ? (
                    <>
                      <li>Account information (email, name, password)</li>
                      <li>Reward points and achievement history</li>
                      <li>Push notification tokens</li>
                      <li>User preferences and settings</li>
                      <li>Personal activity history</li>
                    </>
                ) : (
                    <>
                      <li>معلومات الحساب (البريد الإلكتروني، الاسم، كلمة المرور)</li>
                      <li>نقاط المكافآت وسجل الإنجازات</li>
                      <li>رموز الإشعارات</li>
                      <li>تفضيلات المستخدم والإعدادات</li>
                      <li>سجل النشاطات الشخصية</li>
                    </>
                )}
              </ul>
            </section>

            {/* PROCESSING TIME */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {language === 'ku'
                    ? 'Demjimêra pêvajoyê'
                    : language === 'en'
                        ? 'Processing Time'
                        : 'مدة المعالجة'}
              </h2>

              <p>
                {language === 'ku'
                    ? 'Daxwaza jêbirinê dê di nav 30 rojan de were pêvajokirin. Em ê e-nameyek piştrastkirinê bişînin.'
                    : language === 'en'
                        ? 'Your account deletion request will be processed within 30 days from the date of receipt. You will receive an email confirmation once the deletion is completed.'
                        : 'سيتم معالجة طلب حذف حسابك خلال 30 يومًا من استلام طلبك. سنرسل لك تأكيدًا بالبريد الإلكتروني عند اكتمال عملية الحذف.'}
              </p>
            </section>

            <div className="text-center mt-8 text-sm text-gray-500">
              <p>
                {language === 'ku'
                    ? 'Nûvekirina dawî: Çile 2026'
                    : language === 'en'
                        ? 'Last Updated: January 2026'
                        : 'آخر تحديث: يناير 2026'}
              </p>
            </div>

          </div>
        </div>
      </div>
  );
}