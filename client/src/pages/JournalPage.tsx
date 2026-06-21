import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopHeader from '../components/TopHeader'
import BottomNav from '../components/BottomNav'
import api from '../lib/api'
import { useBiometricGuard } from '../lib/useBiometricGuard'

interface JournalEntry {
  id: string
  createdAt: string
  content: string
  mood?: number
}

export default function JournalPage() {
  const navigate = useNavigate()
  const { isAuthenticated, authenticate, error } = useBiometricGuard()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/journal')
      .then(res => setEntries(res.data?.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const truncate = (text: string, max = 120) =>
    text.length > max ? text.slice(0, max) + '...' : text

  const hasTodayEntry = entries.some(e => {
    const today = new Date().toDateString()
    return new Date(e.createdAt).toDateString() === today
  })

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)' }}>
      <TopHeader title="Journal" />

      <main className="app-main">
        {!isAuthenticated ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center', gap: '20px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-primary)' }}>fingerprint</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px' }}>Diário Bloqueado</h2>
            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-on-surface-variant)', padding: '0 20px' }}>
              Por segurança e privacidade, seu diário precisa ser desbloqueado usando biometria.
            </p>
            {error && <p style={{ color: 'var(--color-forge-orange)', fontSize: '12px' }}>{error}</p>}
            <button
              onClick={authenticate}
              className="glass-panel"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-forge-border)',
                padding: '12px 24px',
                borderRadius: '12px',
                color: 'var(--color-on-surface)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              TENTAR NOVAMENTE
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>Diário</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', opacity: 0.5 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.05em' }}>
                Privado e criptografado
              </p>
            </div>
          </div>
          {!hasTodayEntry && (
            <button
              onClick={() => navigate('/journal/new')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--color-primary)', color: '#0f0d15',
                border: 'none', borderRadius: '12px', padding: '10px 16px',
                fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
                letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
              Escrever
            </button>
          )}
        </div>

        {/* Today's prompt if no entry */}
        {!hasTodayEntry && (
          <div
            className="glass-panel ghost-border"
            style={{
              padding: '20px', borderRadius: '16px', marginBottom: '24px', cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(34,184,207,0.06) 0%, rgba(30,27,38,0.6) 100%)',
            }}
            onClick={() => navigate('/journal/new')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '20px' }}>auto_stories</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>Reflexão de hoje</span>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.6, color: 'var(--color-on-surface)', marginBottom: '16px' }}>
              "O que travou seu foco hoje — e o que destravou?"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-teal)', fontSize: '22px' }}>arrow_forward</span>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: '40px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.1em' }}>
            CARREGANDO...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px', gap: '16px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '9999px',
              background: 'rgba(83, 215, 239, 0.08)', border: '1px solid rgba(83, 215, 239, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--color-primary)', opacity: 0.6 }}>auto_stories</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Nenhum registro ainda</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                Comece a registrar suas reflexões. Seus dados são seus — sempre criptografados.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>
                {entries.length} {entries.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                className="glass-panel ghost-border animate-fade-in-up"
                style={{
                  padding: '18px', borderRadius: '14px', cursor: 'pointer',
                  animationDelay: `${i * 0.05}s`, opacity: 0,
                  transition: 'transform 0.2s',
                }}
                onClick={() => navigate(`/journal/${entry.id}`)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em',
                    color: 'var(--color-forge-teal)', textTransform: 'uppercase',
                  }}>{formatDate(entry.createdAt)}</span>
                  {entry.mood && (
                    <span style={{ fontSize: '18px' }}>
                      {entry.mood >= 4 ? '😊' : entry.mood >= 3 ? '😐' : '😔'}
                    </span>
                  )}
                </div>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.6,
                  color: 'var(--color-on-surface-variant)',
                }}>
                  {truncate(entry.content)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', opacity: 0.4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>lock</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em' }}>CRIPTOGRAFADO</span>
                </div>
              </div>
            ))}
          </div>
        )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
