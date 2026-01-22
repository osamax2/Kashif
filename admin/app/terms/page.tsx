export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6 text-center">
          الشروط والأحكام
        </h1>
        <p className="text-sm text-gray-600 mb-8 text-center">
          آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
        </p>

        <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. مقدمة</h2>
            <p>
              مرحباً بك في تطبيق كاشف ("التطبيق"). باستخدامك للتطبيق، فإنك توافق على
              الالتزام بهذه الشروط والأحكام ("الشروط"). يرجى قراءتها بعناية قبل استخدام
              التطبيق. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام التطبيق.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. وصف الخدمة</h2>
            <p>
              تطبيق كاشف هو منصة للإبلاغ عن حفر الطرق ومشاركة المعلومات مع المجتمع. يتيح التطبيق للمستخدمين:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>الإبلاغ عن حفر الطرق بالصور والموقع</li>
              <li>الكشف التلقائي عن الحفر باستخدام الذكاء الاصطناعي</li>
              <li>تلقي تنبيهات عند الاقتراب من حفر مُبلغ عنها</li>
              <li>جمع النقاط والحصول على مكافآت وقسائم</li>
              <li>المساهمة في تحسين سلامة الطرق في المجتمع</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. التسجيل والحساب</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">3.1 أهلية التسجيل</h3>
            <p>
              يجب أن يكون عمرك 13 عاماً على الأقل لاستخدام التطبيق. بإنشاء حساب، فإنك تؤكد
              أنك تستوفي هذا الشرط.
            </p>
            
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">3.2 مسؤولية الحساب</h3>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>أنت مسؤول عن الحفاظ على سرية معلومات حسابك</li>
              <li>يجب تقديم معلومات دقيقة وحديثة</li>
              <li>أنت مسؤول عن جميع الأنشطة التي تتم من خلال حسابك</li>
              <li>يجب إخطارنا فوراً في حالة أي استخدام غير مصرح به</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. قواعد الاستخدام</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">4.1 الاستخدام المقبول</h3>
            <p>يجب عليك:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>الإبلاغ عن حفر حقيقية وفعلية فقط</li>
              <li>تقديم صور واضحة ودقيقة للحفر</li>
              <li>تحديد الموقع الصحيح للحفر</li>
              <li>استخدام التطبيق بطريقة قانونية ومسؤولة</li>
              <li>احترام حقوق المستخدمين الآخرين</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">4.2 الاستخدام المحظور</h3>
            <p>يُحظر عليك:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>تقديم بلاغات كاذبة أو مضللة</li>
              <li>رفع محتوى غير لائق أو مسيء أو غير قانوني</li>
              <li>محاولة التلاعب بنظام النقاط أو المكافآت</li>
              <li>إنشاء حسابات متعددة للحصول على مزايا غير مشروعة</li>
              <li>استخدام التطبيق أثناء القيادة بطريقة تشتت الانتباه</li>
              <li>نسخ أو توزيع أو تعديل محتوى التطبيق بدون إذن</li>
              <li>محاولة اختراق أو تعطيل التطبيق أو خوادمه</li>
              <li>انتحال شخصية مستخدم آخر أو جهة حكومية</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. نظام النقاط والمكافآت</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">5.1 كسب النقاط</h3>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>تُمنح النقاط مقابل البلاغات الصحيحة والمُتحقق منها</li>
              <li>قد تختلف قيمة النقاط حسب جودة البلاغ وخطورة الحفرة</li>
              <li>نحتفظ بالحق في تعديل نظام النقاط في أي وقت</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">5.2 استبدال النقاط</h3>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>يمكن استبدال النقاط بقسائم من الشركاء المشاركين</li>
              <li>القسائم خاضعة للشروط الخاصة بكل عرض</li>
              <li>النقاط غير قابلة للتحويل أو البيع أو الاستبدال النقدي</li>
              <li>قد تنتهي صلاحية النقاط غير المستخدمة بعد فترة معينة</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">5.3 إلغاء النقاط</h3>
            <p>
              نحتفظ بالحق في إلغاء النقاط المكتسبة بطرق غير مشروعة أو مخالفة للشروط،
              وقد يؤدي ذلك إلى إيقاف أو حذف الحساب.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. الملكية الفكرية</h2>
            <p>
              جميع حقوق الملكية الفكرية في التطبيق ومحتواه (بما في ذلك العلامات التجارية،
              الشعارات، التصميم، الكود، والنصوص) مملوكة لنا أو مرخصة لنا. يُمنع:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>نسخ أو تعديل أو توزيع محتوى التطبيق</li>
              <li>استخدام علاماتنا التجارية بدون إذن كتابي</li>
              <li>الهندسة العكسية أو فك تشفير التطبيق</li>
            </ul>
            <p className="mt-2">
              بتحميل محتوى على التطبيق (صور، بلاغات)، تمنحنا ترخيصاً غير حصري لاستخدام
              هذا المحتوى لتشغيل وتحسين الخدمة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. إخلاء المسؤولية</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">7.1 الخدمة كما هي</h3>
            <p>
              يُقدَّم التطبيق "كما هو" و"حسب التوفر" دون أي ضمانات صريحة أو ضمنية.
              لا نضمن أن التطبيق سيكون متاحاً دائماً أو خالياً من الأخطاء.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">7.2 دقة المعلومات</h3>
            <p>
              نسعى لتوفير معلومات دقيقة، لكننا لا نضمن دقة أو اكتمال أو حداثة البلاغات
              المقدمة من المستخدمين. يجب عليك توخي الحذر دائماً أثناء القيادة.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">7.3 السلامة على الطريق</h3>
            <p className="bg-yellow-50 p-4 rounded-lg border-r-4 border-yellow-400">
              <strong>تحذير هام:</strong> التطبيق أداة مساعدة فقط ولا يُغني عن الانتباه
              أثناء القيادة. أنت المسؤول الوحيد عن سلامتك على الطريق. لا تستخدم التطبيق
              بطريقة تشتت انتباهك عن القيادة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. تحديد المسؤولية</h2>
            <p>
              إلى أقصى حد يسمح به القانون، لن نكون مسؤولين عن:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>أي أضرار مباشرة أو غير مباشرة أو عرضية أو تبعية</li>
              <li>خسارة البيانات أو الأرباح أو السمعة</li>
              <li>أي حوادث أو إصابات ناتجة عن الاعتماد على معلومات التطبيق</li>
              <li>أفعال أو محتوى المستخدمين الآخرين</li>
              <li>انقطاع الخدمة أو الأخطاء التقنية</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. التعويض</h2>
            <p>
              توافق على تعويضنا والدفاع عنا وحمايتنا من أي مطالبات أو أضرار أو
              خسائر أو مصاريف (بما في ذلك أتعاب المحاماة) ناشئة عن:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>استخدامك للتطبيق</li>
              <li>انتهاكك لهذه الشروط</li>
              <li>انتهاكك لحقوق أي طرف ثالث</li>
              <li>المحتوى الذي تقدمه عبر التطبيق</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. إنهاء الحساب</h2>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">10.1 إنهاء من قِبَلك</h3>
            <p>
              يمكنك حذف حسابك في أي وقت من خلال إعدادات التطبيق أو بالتواصل معنا.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">10.2 إنهاء من قِبَلنا</h3>
            <p>
              نحتفظ بالحق في إيقاف أو حذف حسابك في أي وقت ولأي سبب، بما في ذلك
              انتهاك هذه الشروط، دون إشعار مسبق.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">10.3 آثار الإنهاء</h3>
            <p>
              عند إنهاء الحساب، ستفقد جميع النقاط والمكافآت غير المستخدمة، ولن يكون
              لديك حق الوصول إلى بياناتك في التطبيق.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. تعديل الشروط</h2>
            <p>
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنُخطرك بالتغييرات الجوهرية
              عبر التطبيق أو البريد الإلكتروني. استمرارك في استخدام التطبيق بعد
              التعديلات يعني قبولك للشروط المعدلة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. القانون الحاكم</h2>
            <p>
              تخضع هذه الشروط وتُفسَّر وفقاً لقوانين المملكة العربية السعودية.
              أي نزاعات تنشأ عن هذه الشروط أو استخدام التطبيق تخضع للاختصاص
              القضائي الحصري لمحاكم المملكة العربية السعودية.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. أحكام عامة</h2>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>
                <strong>الاستقلالية:</strong> إذا أُبطل أي حكم من هذه الشروط، تظل
                الأحكام الأخرى سارية المفعول.
              </li>
              <li>
                <strong>التنازل:</strong> عدم تطبيقنا لأي حكم لا يعني تنازلنا عن
                حقنا في تطبيقه لاحقاً.
              </li>
              <li>
                <strong>الاتفاق الكامل:</strong> تشكل هذه الشروط مع سياسة الخصوصية
                الاتفاق الكامل بينك وبيننا.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. التواصل معنا</h2>
            <p>
              إذا كانت لديك أي أسئلة أو استفسارات حول هذه الشروط والأحكام، يمكنك
              التواصل معنا عبر:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mt-4">
              <p><strong>البريد الإلكتروني:</strong> contact@kashifroad.com</p>
              <p><strong>الموقع الإلكتروني:</strong> https://admin.kashifroad.com</p>
            </div>
          </section>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} كاشف. جميع الحقوق محفوظة.</p>
            <div className="mt-4 space-x-4 space-x-reverse">
              <a href="/privacy" className="text-blue-600 hover:underline">
                سياسة الخصوصية
              </a>
              <span>|</span>
              <a href="/terms" className="text-blue-600 hover:underline">
                الشروط والأحكام
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
