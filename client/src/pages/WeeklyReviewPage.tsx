import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopHeader from '../components/TopHeader'
import api from '../lib/api'

interface ReviewData {
  goals: { id: string; title: string; weeklyCheckInCount: number }[]
  habits: {
    overallConsistency: number
    summary: { id: string; title: string; weeklyConsistency: number }[]
  }
  reflection: {
    averageMood: number | null
    logsCount: number
  }
}

export default function WeeklyReviewPage() {
  const navigate = useNavigate()
  const [review, setReview] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [userReflection, setUserReflection] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api.get('/weekly-review')
      .then(res => setReview(res.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = () => {
    // The review page is a synthesis view — just mark as reviewed locally
    setSubmitted(true)
  }

  const moodEmoji = (mood: number | null) => {
    if (!mood) return '—'
    if (mood >= 4.5) return '🔥'
    if (mood >= 3.5) return '😊'
    if (mood >= 2.5) return '😐'
    if (mood >= 1.5) return '😔'
    return '💔'
  }

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)' }}>
      <TopHeader title="Revisão" onBack={() => navigate(-1)} />

      <main className="app-main">
        {/* Title */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-orange)', fontSize: '24px' }}>calendar_view_week</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Revisão Semanal
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
            Olhe para trás com curiosidade, não com julgamento.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: '60px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.1em' }}>
            CARREGANDO SEMANA...
          </div>
        ) : submitted ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: '20px', textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '9999px',
              background: 'rgba(47, 158, 92, 0.12)',
              border: '1px solid rgba(47, 158, 92, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined material-symbols-filled" style={{ fontSize: '40px', color: 'var(--color-forge-green)' }}>check_circle</span>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                Revisão concluída!
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>
                Você forjou mais uma semana. Continue na próxima — a consistência é o jogo.
              </p>
            </div>
            <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ maxWidth: '200px' }}>
              Voltar ao início
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div className="glass-panel ghost-border" style={{ padding: '16px 12px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 500, color: 'var(--color-forge-teal)', lineHeight: 1 }}>
                  {review?.habits.overallConsistency ?? 0}%
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-on-surface-variant)', marginTop: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Consistência
                </div>
              </div>
              <div className="glass-panel ghost-border" style={{ padding: '16px 12px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 500, color: 'var(--color-primary)', lineHeight: 1 }}>
                  {review?.reflection.logsCount ?? 0}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-on-surface-variant)', marginTop: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Diários
                </div>
              </div>
              <div className="glass-panel ghost-border" style={{ padding: '16px 12px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '26px', lineHeight: 1 }}>
                  {moodEmoji(review?.reflection.averageMood ?? null)}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-on-surface-variant)', marginTop: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Humor Médio
                </div>
              </div>
            </div>

            {/* Habits consistency */}
            {review?.habits.summary && review.habits.summary.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-green)', fontSize: '16px' }}>cached</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>
                    Hábitos esta semana
                  </span>
                </div>
                <div className="glass-panel ghost-border" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                  {review.habits.summary.map((habit, i) => (
                    <div key={habit.id} style={{
                      padding: '14px 16px',
                      borderBottom: i < review.habits.summary.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500 }}>{habit.title}</span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 500,
                          color: habit.weeklyConsistency >= 80 ? 'var(--color-forge-green)' : habit.weeklyConsistency >= 50 ? 'var(--color-forge-teal)' : 'var(--color-forge-orange)',
                        }}>{habit.weeklyConsistency}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${habit.weeklyConsistency}%`,
                          background: habit.weeklyConsistency >= 80 ? 'var(--color-forge-green)' : undefined,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Goals check-ins this week */}
            {review?.goals && review.goals.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-teal)', fontSize: '16px' }}>target</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>
                    Check-ins das metas
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {review.goals.map(goal => (
                    <div key={goal.id} className="glass-panel ghost-border"
                      style={{ padding: '14px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>{goal.title}</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '13px',
                        color: goal.weeklyCheckInCount > 0 ? 'var(--color-forge-teal)' : 'var(--color-on-surface-variant)',
                      }}>
                        {goal.weeklyCheckInCount} {goal.weeklyCheckInCount === 1 ? 'check-in' : 'check-ins'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Weekly reflection prompt */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '16px' }}>auto_stories</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>
                  Reflexão da semana
                </span>
              </div>
              <div style={{
                padding: '14px 16px', borderRadius: '10px',
                background: 'rgba(83, 215, 239, 0.05)',
                border: '1px solid rgba(83, 215, 239, 0.12)',
                marginBottom: '12px',
              }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.7, color: 'var(--color-on-surface)', fontStyle: 'italic' }}>
                  "O que foi uma vitória esta semana? O que você faria diferente?"
                </p>
              </div>
              <textarea
                value={userReflection}
                onChange={(e) => setUserReflection(e.target.value)}
                placeholder="Escreva livremente..."
                className="forge-textarea"
                rows={5}
                maxLength={2000}
              />
            </section>

            <button
              type="button"
              className="btn-orange"
              onClick={handleSubmit}
              style={{ borderRadius: '12px', padding: '16px 24px' }}
            >
              <span>Concluir revisão semanal</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
