export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">
          سياسة الخصوصية
        </h1>
        <p className="text-sm text-gray-600 mb-8 text-center">
          آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
        </p>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. مقدمة</h2>
            <p>
              مرحباً بك في تطبيق كاشف ("نحن"، "لنا"، أو "الخاص بنا"). نحن ملتزمون بحماية
              خصوصيتك وبياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية
              ومشاركة معلوماتك عند استخدام تطبيق كاشف للهاتف المحمول ("التطبيق").
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. المعلومات التي نجمعها
            </h2>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
              2.1 المعلومات التي تقدمها مباشرة
            </h3>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li><strong>معلومات الحساب:</strong> الاسم، عنوان البريد الإلكتروني، رقم الهاتف، كلمة المرور</li>
              <li><strong>البلاغات:</strong> صور الحفر، الوصف، التاريخ والوقت</li>
              <li><strong>الملف الشخصي:</strong> صورة الملف الشخصي (اختياري)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
              2.2 المعلومات التي نجمعها تلقائياً
            </h3>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li><strong>بيانات الموقع:</strong> موقع GPS الدقيق لتحديد موقع الحفر وإرسال التنبيهات</li>
              <li><strong>معلومات الجهاز:</strong> نوع الجهاز، نظام التشغيل، معرف الجهاز الفريد</li>
              <li><strong>بيانات الاستخدام:</strong> تفاعلاتك مع التطبيق، الميزات المستخدمة، أوقات الاستخدام</li>
              <li><strong>السجلات:</strong> عنوان IP، معلومات المتصفح، أوقات الوصول</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. كيفية استخدام معلوماتك
            </h2>
            <p>نستخدم المعلومات التي نجمعها للأغراض التالية:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>تقديم وصيانة وتحسين خدمات التطبيق</li>
              <li>معالجة وعرض البلاغات عن حفر الطرق</li>
              <li>إرسال تنبيهات السلامة عند الاقتراب من الحفر المبلغ عنها</li>
              <li>حساب النقاط والمكافآت</li>
              <li>إرسال الإشعارات والتحديثات المهمة</li>
              <li>الامتثال للقوانين واللوائح المعمول بها</li>
              <li>تحسين تجربة المستخدم وتطوير ميزات جديدة</li>
              <li>منع الاحتيال وضمان أمن التطبيق</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. مشاركة المعلومات
            </h2>
            <p>نحن لا نبيع معلوماتك الشخصية. قد نشارك معلوماتك في الحالات التالية:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li><strong>مع مستخدمين آخرين:</strong> البلاغات والموقع التقريبي (غير الدقيق) للحفر مرئي لجميع المستخدمين</li>
              <li><strong>مع الجهات الحكومية:</strong> قد نشارك بيانات الحفر مع السلطات المعنية لتحسين البنية التحتية</li>
              <li><strong>مع مقدمي الخدمات:</strong> الشركاء الذين يساعدوننا في تشغيل التطبيق (الاستضافة، التحليلات، إلخ)</li>
              <li><strong>الشركاء التجاريين:</strong> للشركات المشاركة في برنامج القسائم والمكافآت</li>
              <li><strong>الامتثال القانوني:</strong> عندما يُطلب ذلك بموجب القانون أو لحماية حقوقنا</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. بيانات الموقع
            </h2>
            <p>
              يستخدم التطبيق خدمات الموقع لتوفير الوظائف الأساسية:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li><strong>في المقدمة:</strong> لتحديد موقع الحفر عند إنشاء بلاغ</li>
              <li><strong>في الخلفية:</strong> للكشف التلقائي عن الحفر القريبة وإرسال تنبيهات السلامة</li>
            </ul>
            <p className="mt-2">
              يمكنك التحكم في أذونات الموقع من إعدادات جهازك. تعطيل الموقع سيحد من وظائف التطبيق.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. أمن البيانات
            </h2>
            <p>
              نتخذ تدابير أمنية معقولة لحماية معلوماتك:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>تشفير البيانات أثناء النقل (HTTPS/TLS)</li>
              <li>تخزين آمن لكلمات المرور (تجزئة وتمليح)</li>
              <li>مصادقة المستخدم والتحكم في الوصول</li>
              <li>مراقبة منتظمة للأنشطة المشبوهة</li>
            </ul>
            <p className="mt-2">
              ومع ذلك، لا يمكن ضمان أمان 100٪ على الإنترنت. استخدم التطبيق على مسؤوليتك الخاصة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. الاحتفاظ بالبيانات
            </h2>
            <p>
              نحتفظ بمعلوماتك طالما كان حسابك نشطاً أو حسب الحاجة لتقديم الخدمات.
              يمكنك طلب حذف حسابك في أي وقت من إعدادات التطبيق أو عن طريق الاتصال بنا.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              8. حقوقك
            </h2>
            <p>لديك الحقوق التالية فيما يتعلق ببياناتك الشخصية:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li><strong>الوصول:</strong> طلب نسخة من بياناتك</li>
              <li><strong>التصحيح:</strong> تحديث أو تصحيح معلومات غير دقيقة</li>
              <li><strong>الحذف:</strong> طلب حذف حسابك وبياناتك</li>
              <li><strong>الاعتراض:</strong> الاعتراض على معالجة معينة لبياناتك</li>
              <li><strong>قابلية النقل:</strong> الحصول على نسخة من بياناتك بتنسيق منظم</li>
            </ul>
            <p className="mt-2">
              لممارسة هذه الحقوق، يرجى الاتصال بنا على: <a href="mailto:contact@kashifroad.com" className="text-blue-600 hover:underline">contact@kashifroad.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              9. خصوصية الأطفال
            </h2>
            <p>
              التطبيق مصمم للمستخدمين الذين تبلغ أعمارهم 18 عاماً أو أكبر. نحن لا نجمع
              عن قصد معلومات شخصية من الأطفال دون سن 13 عاماً. إذا علمت أننا جمعنا
              معلومات من طفل، يرجى الاتصال بنا فوراً.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              10. التغييرات على سياسة الخصوصية
            </h2>
            <p>
              قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنخطرك بأي تغييرات عن طريق
              نشر السياسة الجديدة على هذه الصفحة وتحديث تاريخ "آخر تحديث" في الأعلى.
              ننصحك بمراجعة سياسة الخصوصية بشكل دوري.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              11. اتصل بنا
            </h2>
            <p>
              إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه، يرجى الاتصال بنا:
            </p>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p><strong>البريد الإلكتروني:</strong> <a href="mailto:contact@kashifroad.com" className="text-blue-600 hover:underline">contact@kashifroad.com</a></p>
              <p><strong>الموقع الإلكتروني:</strong> <a href="https://kashifroad.com" className="text-blue-600 hover:underline">https://kashifroad.com</a></p>
              <p><strong>الموقع الإلكتروني للإدارة:</strong> <a href="https://admin.kashifroad.com" className="text-blue-600 hover:underline">https://admin.kashifroad.com</a></p>
            </div>
          </section>

          <section className="mt-8 p-6 bg-gray-100 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              موافقتك
            </h2>
            <p>
              باستخدام تطبيق كاشف، فإنك توافق على جمع واستخدام معلوماتك كما هو موضح في
              سياسة الخصوصية هذه. إذا كنت لا توافق على هذه السياسة، يرجى عدم استخدام التطبيق.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>© 2026 كاشف - جميع الحقوق محفوظة</p>
          <p className="mt-2">Kashif Road Safety Reporter</p>
        </div>
      </div>
    </div>
  );
}
