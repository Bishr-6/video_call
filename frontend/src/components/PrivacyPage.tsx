export default function PrivacyPage() {
  return (
    <div className="page" style={{ padding: '40px 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '32px', textAlign: 'center', color: 'var(--accent-cyan)' }}>
          سياسة الخصوصية 🔒
        </h1>

        <div className="glass-strong" style={{ padding: '32px', borderRadius: 'var(--radius-xl)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.8' }}>
            نحن في منصة إشارة نأخذ خصوصيتك على محمل الجد. تشرح هذه السياسة كيف نجمع ونستخدم ونحمي معلوماتك الشخصية.
          </p>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>1. المعلومات التي نجمعها</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.8' }}>
              قد نجمع المعلومات التالية:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>•</span>
                <span><strong>معلومات الحساب:</strong> الاسم، البريد الإلكتروني، رقم الهاتف (اختياري)</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>•</span>
                <span><strong>معلومات الاستخدام:</strong> سجل المحادثات (بدون حفظ البيانات الشخصية)، عدد مرات الاستخدام</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>•</span>
                <span><strong>بيانات تقنية:</strong> عنوان IP، نوع المتصفح، نظام التشغيل</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>•</span>
                <span><strong>محتوى الفيديو:</strong> لا نحفظ فيديوهات لغة الإشارة الخاصة بك</span>
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>2. كيف نستخدم معلوماتك</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.8' }}>
              نستخدم المعلومات التي نجمعها للأغراض التالية:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ color: 'var(--text-secondary)' }}>✓ توفير وتحسين الخدمات</li>
              <li style={{ color: 'var(--text-secondary)' }}>✓ التواصل معك حول التحديثات والأخبار</li>
              <li style={{ color: 'var(--text-secondary)' }}>✓ تحسين تجربة المستخدم</li>
              <li style={{ color: 'var(--text-secondary)' }}>✓ الامتثال للقوانين واللوائح</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>3. حماية بيانات صديقي الآمن</h2>
            <div style={{
              padding: '16px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              lineHeight: '1.8',
              marginBottom: '16px'
            }}>
              <p style={{ marginBottom: '8px' }}>
                <strong style={{ color: 'var(--accent-green)' }}>✓ معايير الخصوصية المحسنة:</strong>
              </p>
              <ul style={{ listStyle: 'none', padding: 0, paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>• لا نحفظ سجل المحادثات الشخصية للطلاب</li>
                <li>• البيانات المرسلة مشفرة باستخدام SSL/TLS</li>
                <li>• لا نشارك بيانات الطلاب مع أطراف ثالثة</li>
                <li>• يتم حذف سجلات الجلسة بعد 30 يوماً</li>
              </ul>
            </div>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>4. أمان البيانات</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '12px' }}>
              نتخذ تدابير أمنية معقولة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التعديل. ومع ذلك، 
              لا توجد طريقة نقل عبر الإنترنت آمنة تماماً.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ color: 'var(--text-secondary)' }}>🔐 تشفير من طرف إلى طرف</li>
              <li style={{ color: 'var(--text-secondary)' }}>🛡️ جدران الحماية المتقدمة</li>
              <li style={{ color: 'var(--text-secondary)' }}>🔑 كلمات مرور قوية ومصادقة ثنائية</li>
              <li style={{ color: 'var(--text-secondary)' }}>📊 مراقبة أمنية 24/7</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>5. حقوقك</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.8' }}>
              لديك الحقوق التالية:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>1</span>
                <span><strong>حق الوصول:</strong> يمكنك طلب نسخة من بيانات الحساب</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>2</span>
                <span><strong>حق التصحيح:</strong> يمكنك تصحيح المعلومات غير الدقيقة</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>3</span>
                <span><strong>حق الحذف:</strong> يمكنك طلب حذف حسابك وبيانات معينة</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>4</span>
                <span><strong>حق الاعتراض:</strong> يمكنك الاعتراض على معالجة بيانات معينة</span>
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>6. ملفات تعريف الارتباط (Cookies)</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              تستخدم المنصة ملفات تعريف الارتباط لتحسين تجربتك. يمكنك تعطيل الملفات من إعدادات المتصفح، 
              لكن قد تتأثر بعض الميزات.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>7. تغييرات هذه السياسة</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              قد نحدث سياسة الخصوصية هذه من وقت لآخر. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار على المنصة.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>8. الاتصال بنا</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '12px' }}>
              إذا كانت لديك أي مخاوف بشأن خصوصيتك، يرجى التواصل معنا على:
            </p>
            <div style={{
              padding: '16px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)'
            }}>
              <p style={{ marginBottom: '8px' }}>📧 البريد الإلكتروني: privacy@eshara.com</p>
              <p style={{ marginBottom: '8px' }}>📞 الهاتف: +966 XX XXX XXXX</p>
              <p>🌐 الموقع: www.eshara.com</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
