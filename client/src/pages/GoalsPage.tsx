import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopHeader from '../components/TopHeader'
import BottomNav from '../components/BottomNav'
import api from '../lib/api'
import { calculateGoalProgress, getDeadlineContext } from '../utils/goalProgress'

interface ActionPlan {
  triggerCue: string
  action: string
}

interface Goal {
  id: string
  title: string
  specificOutcome: string
  metric?: string
  difficulty: string
  status: string
  deadline?: string
  expectedCheckIns?: number
  actionPlans: ActionPlan[]
  checkIns: { id: string; note?: string; createdAt: string }[]
}

export default function GoalsPage() {
  const navigate = useNavigate()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/goals')
      .then(res => setGoals(res.data?.goals ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'var(--color-forge-green)'
      case 'medium': return 'var(--color-forge-teal)'
      case 'hard': return 'var(--color-forge-orange)'
      case 'extreme': return 'var(--color-error)'
      default: return 'var(--color-forge-teal)'
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    const map: Record<string, string> = { easy: 'Fácil', medium: 'Moderada', hard: 'Difícil', extreme: 'Extrema' }
    return map[difficulty] ?? difficulty
  }

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)' }}>
      <TopHeader title="Goals" />

      <main className="app-main">
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>Metas</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)', marginTop: '4px', letterSpacing: '0.05em' }}>
              {goals.length} meta{goals.length !== 1 ? 's' : ''} ativa{goals.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate('/goals/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--color-forge-teal)', color: '#0f0d15',
              border: 'none', borderRadius: '12px', padding: '10px 16px',
              fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'opacity 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Nova
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: '60px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.1em' }}>
            CARREGANDO...
          </div>
        ) : goals.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: '16px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '9999px',
              background: 'rgba(34, 184, 207, 0.08)', border: '1px solid rgba(34, 184, 207, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--color-forge-teal)', opacity: 0.6 }}>target</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Nenhuma meta ainda</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                Defina sua primeira meta e crie um plano Se-Então para ativá-la.
              </p>
            </div>
            <button onClick={() => navigate('/goals/new')} className="btn-primary" style={{ maxWidth: '200px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Criar meta
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {goals.map((goal, i) => {
              const progress = calculateGoalProgress({
                hasDeadline: !!goal.deadline,
                checkIns: goal.checkIns,
                expectedCheckIns: goal.expectedCheckIns,
              })
              const diffColor = getDifficultyColor(goal.difficulty)
              const firstPlan = goal.actionPlans?.[0]

              return (
                <div
                  key={goal.id}
                  className="glass-panel ghost-border animate-fade-in-up"
                  style={{
                    padding: '20px', borderRadius: '16px', cursor: 'pointer',
                    animationDelay: `${i * 0.05}s`, opacity: 0,
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => navigate(`/goals/${goal.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
                          textTransform: 'uppercase', color: diffColor,
                          padding: '2px 6px', borderRadius: '4px',
                          background: `${diffColor}18`, border: `1px solid ${diffColor}30`,
                        }}>{getDifficultyLabel(goal.difficulty)}</span>
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600 }}>{goal.title}</h3>
                      {goal.specificOutcome && (
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-on-surface-variant)', marginTop: '4px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {goal.specificOutcome}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 500, color: 'var(--color-forge-teal)', lineHeight: 1 }}>{progress}%</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>
                        {goal.checkIns.length} check-in{goal.checkIns.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="progress-bar" style={{ marginBottom: '12px' }}>
                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                  </div>

                  {/* If-then plan chip */}
                  {firstPlan && (
                    <div className="tag-chip">
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>bolt</span>
                      Se {firstPlan.triggerCue.length > 30 ? firstPlan.triggerCue.slice(0, 27) + '...' : firstPlan.triggerCue}
                    </div>
                  )}

                  {/* Deadline */}
                  {goal.deadline && (() => {
                    const { daysRemaining, isOverdue } = getDeadlineContext(goal.deadline)
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>calendar_today</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                            {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: '10px',
                          color: isOverdue ? 'var(--color-error)' : 'var(--color-forge-teal)',
                          background: isOverdue ? 'rgba(255, 107, 107, 0.1)' : 'rgba(34, 184, 207, 0.1)',
                          padding: '2px 6px', borderRadius: '4px',
                        }}>
                          {isOverdue ? 'Atrasada' : `Faltam ${daysRemaining} dias`}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
