import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopHeader from '../components/TopHeader'
import BottomNav from '../components/BottomNav'
import api from '../lib/api'
import { useAppForeground } from '../lib/useAppForeground'
import { useHaptics } from '../lib/useHaptics'

interface Habit {
  id: string
  title: string
  completedToday: boolean
  consistency: number
  cue?: string
  recentCheckIns?: { date: string; completed: boolean }[]
}

export default function HabitsPage() {
  const navigate = useNavigate()
  const { triggerSuccess } = useHaptics()
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHabits = () => {
    api.get('/habits')
      .then(res => setHabits(res.data?.habits ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHabits()
  }, [])

  useAppForeground(() => {
    fetchHabits()
  })

  const toggleHabit = async (habitId: string, currentState: boolean) => {
    if (currentState) return // Can't uncheck via this UI
    try {
      await api.post(`/habits/${habitId}/checkin`, {
        date: new Date().toISOString().split('T')[0],
        completed: true,
      })
      triggerSuccess()
      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completedToday: true } : h))
    } catch {
      // No-op
    }
  }

  const getConsistencyColor = (rate: number) => {
    if (rate >= 80) return 'var(--color-forge-green)'
    if (rate >= 50) return 'var(--color-forge-teal)'
    return 'var(--color-forge-orange)'
  }

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)' }}>
      <TopHeader title="Habits" />

      <main className="app-main">
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>Hábitos</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)', marginTop: '4px', letterSpacing: '0.05em' }}>
              Consistência em 30 dias · sem punição
            </p>
          </div>
          <button
            onClick={() => navigate('/habits/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--color-forge-green)', color: '#fff',
              border: 'none', borderRadius: '12px', padding: '10px 16px',
              fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Novo
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: '60px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.1em' }}>
            CARREGANDO...
          </div>
        ) : habits.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 24px', gap: '16px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '9999px',
              background: 'rgba(47, 158, 92, 0.08)', border: '1px solid rgba(47, 158, 92, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--color-forge-green)', opacity: 0.6 }}>cached</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Nenhum hábito ainda</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                Crie hábitos consistentes. Sem streak a perder — apenas progresso a celebrar.
              </p>
            </div>
            <button onClick={() => navigate('/habits/new')} className="btn-primary" style={{ maxWidth: '200px', backgroundColor: 'var(--color-forge-green)', color: '#fff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Criar hábito
            </button>
          </div>
        ) : (
          <>
            {/* Today's habits */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-green)', fontSize: '16px' }}>today</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>Hoje</span>
              </div>
              <div className="glass-panel ghost-border" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                {habits.map((habit, i) => (
                  <div
                    key={habit.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderBottom: i < habits.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => navigate(`/habits/${habit.id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                      <button
                        className={`habit-check ${habit.completedToday ? 'checked' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleHabit(habit.id, habit.completedToday) }}
                        aria-label={`Marcar ${habit.title}`}
                      >
                        {habit.completedToday && (
                          <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>check</span>
                        )}
                      </button>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500,
                          textDecoration: habit.completedToday ? 'line-through' : 'none',
                          opacity: habit.completedToday ? 0.5 : 1,
                          transition: 'opacity 0.3s',
                        }}>{habit.title}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <div style={{
                            width: '60px', height: '3px',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '9999px', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${habit.consistency}%`, height: '100%',
                              background: getConsistencyColor(habit.consistency),
                              borderRadius: '9999px',
                            }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: getConsistencyColor(habit.consistency) }}>
                            {habit.consistency}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-on-surface-variant)', opacity: 0.4 }}>chevron_right</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Consistency note */}
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(47, 158, 92, 0.05)',
              border: '1px solid rgba(47, 158, 92, 0.12)',
              marginTop: '16px',
              display: 'flex', gap: '10px', alignItems: 'flex-start',
            }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-green)', fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>info</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                A consistência é medida em 30 dias. Sem punição por dias perdidos — apenas celebração pelo progresso.
              </p>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
