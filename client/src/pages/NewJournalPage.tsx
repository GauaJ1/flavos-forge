import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopHeader from '../components/TopHeader'
import api from '../lib/api'
import { useBiometricGuard } from '../lib/useBiometricGuard'
import { getDailyPrompt } from '../utils/journalPrompt'

const MOOD_OPTIONS = [
  { value: 5, emoji: '🔥', label: 'Excelente' },
  { value: 4, emoji: '😊', label: 'Bom' },
  { value: 3, emoji: '😐', label: 'Neutro' },
  { value: 2, emoji: '😔', label: 'Difícil' },
  { value: 1, emoji: '💔', label: 'Péssimo' },
]

export default function NewJournalPage() {
  const navigate = useNavigate()
  const { isAuthenticated, authenticate, error } = useBiometricGuard()
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const prompt = getDailyPrompt()

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  const onSubmit = async () => {
    if (content.trim().length < 10) {
      setApiError('Escreva ao menos algumas palavras antes de salvar.')
      return
    }
    setIsSubmitting(true)
    setApiError(null)
    try {
      await api.post('/journal', {
        content: content.trim(),
        mood: mood ?? undefined,
      })
      navigate('/journal')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setApiError(axiosErr.response?.data?.message ?? 'Erro ao salvar entrada.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)', display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <TopHeader title="Escrever" onBack={() => navigate(-1)} />

      <main className="app-main-wide" style={{ flex: 1 }}>
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
            {/* Date + encryption */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em',
            color: 'var(--color-forge-teal)', textTransform: 'uppercase',
          }}>
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.45 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em' }}>AES-256 · PRIVADO</span>
          </div>
        </div>

        {/* Prompt */}
        <div style={{
          padding: '16px', borderRadius: '12px',
          background: 'rgba(83, 215, 239, 0.05)',
          border: '1px solid rgba(83, 215, 239, 0.12)',
        }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.7, color: 'var(--color-on-surface)', fontStyle: 'italic' }}>
            "{prompt}"
          </p>
        </div>

        {/* Mood selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
            Como foi seu dia?
          </span>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            {MOOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMood(opt.value)}
                title={opt.label}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: '10px',
                  border: mood === opt.value
                    ? '1px solid var(--color-forge-teal)'
                    : '1px solid rgba(255,255,255,0.08)',
                  background: mood === opt.value ? 'rgba(34,184,207,0.1)' : 'var(--color-input-bg)',
                  fontSize: '22px', cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s, transform 0.1s',
                  transform: mood === opt.value ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Text area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
              Sua reflexão
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', opacity: 0.5 }}>
              {wordCount} {wordCount === 1 ? 'palavra' : 'palavras'}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva livremente. Ninguém vai ver isso além de você..."
            className="forge-textarea"
            style={{ minHeight: '220px', lineHeight: 1.8 }}
            maxLength={5000}
            autoFocus
          />
        </div>

        {apiError && (
          <div style={{ padding: '12px 16px', background: 'rgba(147, 0, 10, 0.15)', border: '1px solid rgba(255, 180, 171, 0.2)', borderRadius: '0.5rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-error)' }}>{apiError}</p>
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          onClick={onSubmit}
          disabled={isSubmitting || content.trim().length < 10}
        >
          {isSubmitting ? 'Salvando...' : <>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
            Salvar reflexão
          </>}
        </button>

        <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Descartar</button>
          </>
        )}
      </main>
    </div>
  )
}
