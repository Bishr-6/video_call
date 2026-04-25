import { useEffect, useMemo, useState } from 'react'

type SourceItem = {
  name: string
  description: string
  type: string
  priority: number | null
  enabled: boolean
  input_dir: string
  link: string | null
  formats: string[]
  note: string | null
  requires_landmarks: boolean
  has_skeleton: boolean
}

type SourcesResponse =
  | { success: true; version: string; sources: SourceItem[] }
  | { success: false; error: string }

function getServerUrl() {
  const rawUrl = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:5000'
  return rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
}

export default function SourcesPanel({ compact }: { compact?: boolean }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sources, setSources] = useState<SourceItem[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError('')
        const res = await fetch(`${getServerUrl()}/api/sources`, { signal: AbortSignal.timeout(15000) })
        const data = (await res.json()) as SourcesResponse
        if (!res.ok || !data || (data as any).success === false) {
          throw new Error((data as any)?.error || `HTTP ${res.status}`)
        }
        if (!cancelled) setSources((data as any).sources || [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'تعذر تحميل المصادر')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const sorted = useMemo(() => {
    return [...sources].sort((a, b) => {
      const pa = a.priority ?? 999
      const pb = b.priority ?? 999
      if (pa !== pb) return pa - pb
      return a.name.localeCompare(b.name)
    })
  }, [sources])

  return (
    <div className="glass-strong" style={{ padding: compact ? 14 : 18, marginTop: compact ? 12 : 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <h3 style={{ fontWeight: 800, margin: 0 }}>🌍 المصادر المضافة للنظام</h3>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {loading ? 'جاري التحميل…' : `${sorted.length} مصادر`}
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--accent-orange)', fontSize: '0.9rem' }}>
          ⚠️ تعذر تحميل قائمة المصادر من السيرفر: {error}
        </div>
      )}

      {!error && !loading && sorted.length === 0 && (
        <div style={{ color: 'var(--text-secondary)' }}>لا توجد مصادر معرفة حالياً.</div>
      )}

      {!error && sorted.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {sorted.map((s) => (
            <div key={s.name} className="glass" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>{s.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4, lineHeight: 1.6 }}>
                    {s.description}
                  </div>
                </div>
                <span
                  className="privacy-badge"
                  title={s.enabled ? 'مفعّل للمعالجة' : 'غير مفعّل حالياً (يمكن تفعيله من datasets_config.json)'}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {s.enabled ? '✅ مفعّل' : '⏸️ غير مفعّل'}
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <span className="privacy-badge">📦 النوع: {s.type}</span>
                {s.has_skeleton && <span className="privacy-badge">🦴 Skeleton</span>}
                {s.requires_landmarks && <span className="privacy-badge">🖐️ Landmarks</span>}
                {s.formats?.length > 0 && <span className="privacy-badge">🗂️ {s.formats.join(' / ')}</span>}
              </div>

              {(s.link || s.note) && (
                <div style={{ marginTop: 10, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {s.link && (
                    <div>
                      🔗 <a href={s.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>
                        رابط المصدر
                      </a>
                    </div>
                  )}
                  {s.note && <div>ℹ️ {s.note}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
        ملاحظة: الصور تحتاج استخراج Landmarks أولاً، بينما بعض المصادر توفر Skeleton جاهز وهو الأقرب لصيغة التدريب داخل <code>MP_Data</code>.
      </div>
    </div>
  )
}

