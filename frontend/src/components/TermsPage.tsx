export default function TermsPage() {
  return (
    <div className="page" style={{ padding: '40px 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '32px', textAlign: 'center', color: 'var(--accent-cyan)' }}>
          الشروط والأحكام 📋
        </h1>

        <div className="glass-strong" style={{ padding: '32px', borderRadius: 'var(--radius-xl)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.8' }}>
            يرجى قراءة هذه الشروط والأحكام بعناية قبل استخدام منصة إشارة. باستخدامك للمنصة، فإنك توافق على الالتزام بجميع هذه الشروط.
          </p>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>1. شروط الاستخدام</h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>1.1</span>
                <span>يجب أن تكون بعمر 13 سنة على الأقل لاستخدام هذه المنصة</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>1.2</span>
                <span>أنت مسؤول عن الحفاظ على سرية أي بيانات دخول خاصة بك</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>1.3</span>
                <span>لا تستخدم المنصة لأغراض غير قانونية أو ضارة</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>1.4</span>
                <span>احترم حقوق الملكية الفكرية والبيانات الشخصية للآخرين</span>
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>2. محتوى المستخدم</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '12px' }}>
              أي محتوى تنشره على المنصة يجب أن يكون:
            </p>
            <ul style={{ listStyle: 'none', padding: 0, paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li style={{ color: 'var(--text-secondary)' }}>✓ مستقيم ومحترم وخالي من العنف والتمييز</li>
              <li style={{ color: 'var(--text-secondary)' }}>✓ خالي من المحتوى المسيء أو غير الأخلاقي</li>
              <li style={{ color: 'var(--text-secondary)' }}>✓ لا ينتهك حقوق الآخرين</li>
              <li style={{ color: 'var(--text-secondary)' }}>✓ مملوك لك أو لديك حقوق لاستخدامه</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>3. الخدمات والمسؤولية</h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>3.1</span>
                <span>المنصة توفر "كما هي" دون أي ضمانات صريحة أو ضمنية</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>3.2</span>
                <span>لا نتحمل مسؤولية عن أي أضرار مباشرة أو غير مباشرة من استخدام المنصة</span>
              </li>
              <li style={{ display: 'flex', gap: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>3.3</span>
                <span>قد نقوم بصيانة المنصة أو إيقافها بدون إشعار مسبق</span>
              </li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>4. الملكية الفكرية</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              جميع محتويات وتصاميم وشيفرات المنصة محمية بحقوق الملكية الفكرية. لا يُسمح بنسخ أو توزيع أو تعديل أي جزء من المنصة 
              بدون الحصول على إذن كتابي من الفريق.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>5. الدعم النفسي</h2>
            <div style={{
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              lineHeight: '1.8'
            }}>
              <p style={{ marginBottom: '8px' }}>
                <strong style={{ color: 'var(--accent-red)' }}>⚠️ تنبيه مهم:</strong>
              </p>
              <p>
                "صديقي الآمن" هو مساعد تعليمي فقط ولا يقدم استشارات نفسية متخصصة. إذا كنت تعاني من مشاكل نفسية خطيرة، 
                يرجى التواصل مع متخصص نفسي أو طبيب مؤهل. في حالات الطوارئ، اتصل بخدمات الطوارئ أو المرشد الطلابي.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>6. تعديل الشروط</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار على المنصة. 
              استمرارك في استخدام المنصة يعني قبولك للشروط المعدلة.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: 'var(--text-primary)' }}>7. الاتصال بنا</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '12px' }}>
              إذا كانت لديك أي أسئلة حول هذه الشروط، يرجى التواصل معنا على:
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              📧 البريد الإلكتروني: support@eshara.com<br />
              📞 الهاتف: +966 XX XXX XXXX
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
