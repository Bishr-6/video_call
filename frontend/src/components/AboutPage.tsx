export default function AboutPage() {
  return (
    <div className="page" style={{ padding: '40px 24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '32px', textAlign: 'center', color: 'var(--accent-cyan)' }}>
          من نحن؟ 👋
        </h1>

        <div className="glass-strong" style={{ padding: '40px', borderRadius: 'var(--radius-xl)', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
            منصة إشارة - الجسر بين لغة الإشارة والتواصل
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '16px', fontSize: '1rem' }}>
            منصة إشارة هي منصة تقنية متقدمة تهدف إلى تحسين التواصل والتفاهم بين الأشخاص الصم والبكم والمجتمع العام. 
            نحن نؤمن بأن التكنولوجيا يمكن أن تكون جسراً قوياً لتسهيل التواصل والتعليم.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎯</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '700' }}>رؤيتنا</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              عالم يسوده التفاهم والتواصل السلس بين جميع فئات المجتمع من خلال التكنولوجيا الذكية
            </p>
          </div>

          <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💡</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '700' }}>مهمتنا</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              تطوير أدوات ذكية تسهل تعليم وترجمة لغة الإشارة العربية وتدعم الطلاب نفسياً
            </p>
          </div>

          <div className="glass" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🌟</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '700' }}>قيمنا</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              الشمول والأمان والابتكار والجودة في خدمة المجتمع
            </p>
          </div>
        </div>

        <div className="glass-strong" style={{ padding: '40px', borderRadius: 'var(--radius-xl)', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'var(--text-primary)' }}>
            المميزات الرئيسية
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>✓</span>
              <div>
                <h4 style={{ marginBottom: '4px', color: 'var(--text-primary)' }}>🤟 المترجم الذكي</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>تحويل فيديوهات لغة الإشارة إلى نصوص باستخدام الذكاء الاصطناعي</p>
              </div>
            </li>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>✓</span>
              <div>
                <h4 style={{ marginBottom: '4px', color: 'var(--text-primary)' }}>📹 مكالمات فيديو مباشرة</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>التواصل المباشر مع دعم لترجمة لغة الإشارة في الوقت الفعلي</p>
              </div>
            </li>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>✓</span>
              <div>
                <h4 style={{ marginBottom: '4px', color: 'var(--text-primary)' }}>💙 صديقي الآمن</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>مساعد ذكي للدعم النفسي التعليمي للطلاب في فترات الضغوط</p>
              </div>
            </li>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--accent-cyan)' }}>✓</span>
              <div>
                <h4 style={{ marginBottom: '4px', color: 'var(--text-primary)' }}>🎨 إنشاء صور تعليمية</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>توليد صور توضيحية تساعد في شرح الدروس</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="glass-strong" style={{ padding: '40px', borderRadius: 'var(--radius-xl)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'var(--text-primary)' }}>
            فريقنا
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px'
          }}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                👨‍💼
              </div>
              <h3 style={{ marginBottom: '4px', color: 'var(--text-primary)' }}>بشر جرار</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>مطور الذكاء الاصطناعي</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                👨‍💻
              </div>
              <h3 style={{ marginBottom: '4px', color: 'var(--text-primary)' }}>رضوان منذر</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>مطور الويب والتطبيقات</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-red))',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                👨‍🏫
              </div>
              <h3 style={{ marginBottom: '4px', color: 'var(--text-primary)' }}>أ.د. صهيب سيد</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>المشرف والموجه الأكاديمي</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
