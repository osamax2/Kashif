export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          حذف الحساب
        </h1>
        
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              كيفية طلب حذف حسابك
            </h2>
            <p className="text-gray-700 mb-4">
              نحترم حقك في حذف بياناتك الشخصية. لطلب حذف حسابك وجميع البيانات المرتبطة به في تطبيق كاشف للسلامة على الطرق، يرجى اتباع الخطوات التالية:
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              خطوات الحذف
            </h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>أرسل بريدًا إلكترونيًا إلى: <a href="mailto:contact@kashifroad.com" className="text-blue-600 hover:text-blue-800 font-semibold">contact@kashifroad.com</a></li>
              <li>اكتب في موضوع الرسالة: "طلب حذف الحساب" أو "Delete Account Request"</li>
              <li>ضمّن في الرسالة:
                <ul className="list-disc list-inside mr-6 mt-2 space-y-1">
                  <li>عنوان البريد الإلكتروني المسجل في التطبيق</li>
                  <li>اسم المستخدم (إذا كان متاحًا)</li>
                  <li>تأكيد رغبتك في حذف الحساب</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              البيانات التي سيتم حذفها
            </h2>
            <p className="text-gray-700 mb-3">
              عند حذف حسابك، سيتم حذف البيانات التالية بشكل دائم:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>معلومات الحساب (البريد الإلكتروني، الاسم، كلمة المرور)</li>
              <li>نقاط المكافآت وسجل الإنجازات</li>
              <li>رموز الإشعارات (Push notification tokens)</li>
              <li>تفضيلات المستخدم والإعدادات</li>
              <li>سجل النشاطات الشخصية</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              البيانات التي سيتم الاحتفاظ بها
            </h2>
            <p className="text-gray-700 mb-3">
              قد يتم الاحتفاظ بالبيانات التالية لأسباب تشغيلية أو قانونية:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>التقارير العامة:</strong> تقارير الحفر والأضرار التي أرسلتها ستبقى متاحة للجمهور (بدون ربطها باسمك أو معلومات حسابك)</li>
              <li><strong>الصور:</strong> صور الحفر المرفوعة قد تبقى في النظام للمصلحة العامة</li>
              <li><strong>السجلات القانونية:</strong> نحتفظ بسجلات معينة لمدة محدودة للامتثال للقوانين</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              مدة المعالجة
            </h2>
            <p className="text-gray-700">
              سيتم معالجة طلب حذف حسابك خلال <strong>30 يومًا</strong> من استلام طلبك. سنرسل لك تأكيدًا بالبريد الإلكتروني عند اكتمال عملية الحذف.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              الاحتفاظ الإضافي
            </h2>
            <p className="text-gray-700">
              بعد حذف الحساب، قد نحتفظ ببعض البيانات المجمعة والمجهولة لأغراض إحصائية وتحليلية لمدة تصل إلى <strong>12 شهرًا</strong>. هذه البيانات لا يمكن ربطها بشخصك.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              معلومات مهمة
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>حذف الحساب نهائي ولا يمكن التراجع عنه</li>
              <li>لن تتمكن من استعادة نقاطك أو إنجازاتك بعد الحذف</li>
              <li>يمكنك إنشاء حساب جديد في أي وقت باستخدام بريد إلكتروني مختلف</li>
              <li>التقارير العامة التي أنشأتها ستبقى مرئية للمستخدمين الآخرين (بدون معلومات تعريفية)</li>
            </ul>
          </section>

          <section className="mb-8 bg-blue-50 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              اتصل بنا
            </h2>
            <p className="text-gray-700 mb-2">
              إذا كان لديك أي أسئلة حول عملية حذف الحساب، يرجى التواصل معنا:
            </p>
            <p className="text-gray-700">
              <strong>البريد الإلكتروني:</strong> <a href="mailto:contact@kashifroad.com" className="text-blue-600 hover:text-blue-800 font-semibold">contact@kashifroad.com</a>
            </p>
            <p className="text-gray-700">
              <strong>الموقع الإلكتروني:</strong> <a href="https://kashifroad.com" className="text-blue-600 hover:text-blue-800">kashifroad.com</a>
            </p>
          </section>

          <div className="text-center mt-8 text-sm text-gray-500">
            <p>آخر تحديث: يناير 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
