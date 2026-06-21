import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopHeader from '../components/TopHeader'
import BottomNav from '../components/BottomNav'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { useAppForeground } from '../lib/useAppForeground'
import { getFreshStartContext } from '../utils/freshStart'

interface GoalSummary {
  id: string
  title: string
  progress: number
  ifThenPlan?: string
}

interface HabitSummary {
  id: string
  title: string
  completedToday: boolean
  consistency: number
}

interface DashboardData {
  ritualsToday: number
  ritualsTotal: number
  goals: GoalSummary[]
  habits: HabitSummary[]
  hasJournalToday: boolean
  weekday: string
}

interface CoachInsight {
  summary: string
  highlight: string
  suggestion: string
}

export default function DashboardPage() {
  const { user, setUser } = useAuthStore()
  const navigate = useNavigate()
  const dialRef = useRef<SVGGElement>(null)
  const [data, setData] = useState<DashboardData>({
    ritualsToday: 0,
    ritualsTotal: 0,
    goals: [],
    habits: [],
    hasJournalToday: false,
    weekday: '',
  })
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState<CoachInsight | null>(null)
  const [insightLocked, setInsightLocked] = useState(true)
  const [insightLoading, setInsightLoading] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  // Progress Principle — toast que aparece após check-in vinculado a meta
  const [goalImpactMsg, setGoalImpactMsg] = useState<string | null>(null)

  const { isMonday, isMonthStart } = getFreshStartContext()

  const fetchInsight = async () => {
    setInsightLoading(true)
    try {
      const { data: resData } = await api.get('/coach/insight')
      if (resData.isLocked) {
        setInsightLocked(true)
        setInsight(null)
      } else {
        setInsightLocked(false)
        setInsight(resData.insight)
      }
    } catch {
      setInsightLocked(true)
      setInsight(null)
    } finally {
      setInsightLoading(false)
    }
  }

  const handleUpgradeToggle = async () => {
    setIsUpgrading(true)
    try {
      const { data: upgradeRes } = await api.post('/auth/upgrade')
      setUser(upgradeRes.user)
    } catch (err) {
      console.error('Failed to toggle plan:', err)
    } finally {
      setIsUpgrading(false)
    }
  }

  const fetchDashboard = async () => {
    try {
      const [goalsRes, habitsRes, journalRes] = await Promise.all([
        api.get('/goals'),
        api.get('/habits'),
        api.get('/journal')
      ])

      const goals = goalsRes.data?.goals ?? []
      const habits = habitsRes.data?.habits ?? []
      const journalEntries = journalRes.data?.entries ?? []
      
      const today = new Date().toDateString()
      const hasJournalToday = journalEntries.some((e: any) => new Date(e.createdAt).toDateString() === today)

      const completedHabits = habits.filter((h: HabitSummary) => h.completedToday).length
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

      setData({
        ritualsToday: completedHabits,
        ritualsTotal: habits.length || 1,
        goals: goals.slice(0, 3),
        habits: habits.slice(0, 4),
        hasJournalToday,
        weekday: days[new Date().getDay()],
      })
    } catch {
      // Silently use default state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  useAppForeground(() => {
    fetchDashboard()
  })

  useEffect(() => {
    if (user) {
      fetchInsight()
    }
  }, [user])

  // Draw progress dial ticks
  useEffect(() => {
    const g = dialRef.current
    if (!g) return
    g.innerHTML = ''
    for (let i = 0; i < 24; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      const isMain = i % 6 === 0
      line.setAttribute('x1', '50')
      line.setAttribute('y1', isMain ? '5' : '8')
      line.setAttribute('x2', '50')
      line.setAttribute('y2', '12')
      line.setAttribute('stroke', isMain ? 'rgba(188, 201, 204, 0.4)' : 'rgba(188, 201, 204, 0.15)')
      line.setAttribute('stroke-width', '1.5')
      line.setAttribute('transform', `rotate(${i * 15} 50 50)`)
      g.appendChild(line)
    }
  }, [])

  const progressRatio = data.ritualsTotal > 0 ? data.ritualsToday / data.ritualsTotal : 0
  const circumference = 2 * Math.PI * 42
  const dashOffset = circumference * (1 - progressRatio)
  const isSunday = new Date().getDay() === 0

  const toggleHabit = async (habitId: string, currentState: boolean) => {
    try {
      if (!currentState) {
        const { data: checkinData } = await api.post(`/habits/${habitId}/checkin`, {
          date: new Date().toISOString().split('T')[0],
          completed: true,
        })
        // Progress Principle — exibe impacto na meta vinculada quando existir
        if (checkinData?.goalImpact?.goalTitle) {
          setGoalImpactMsg(`Isso também avança sua meta: ${checkinData.goalImpact.goalTitle}`)
          // Auto-dismiss após 4 s (não há botão de culpa ou contador de pressão)
          setTimeout(() => setGoalImpactMsg(null), 4000)
        }
      }
      setData(prev => ({
        ...prev,
        habits: prev.habits.map(h =>
          h.id === habitId ? { ...h, completedToday: !currentState } : h
        ),
        ritualsToday: prev.ritualsToday + (currentState ? -1 : 1),
      }))
    } catch {
      // No-op
    }
  }

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)' }}>
      <TopHeader showAvatar />

      {/* Progress Principle toast — aparece após check-in vinculado a meta */}
      {goalImpactMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, maxWidth: '340px', width: 'calc(100% - 32px)',
            background: 'rgba(47, 158, 92, 0.92)', backdropFilter: 'blur(8px)',
            color: '#fff', padding: '12px 16px', borderRadius: '12px',
            fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', flexShrink: 0 }}>trending_up</span>
          <span>{goalImpactMsg}</span>
          <button
            onClick={() => setGoalImpactMsg(null)}
            style={{ background: 'none', border: 'none', color: '#fff', marginLeft: 'auto', cursor: 'pointer', opacity: 0.7 }}
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>
      )}

      <main className="app-main">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.1em' }}>
              CARREGANDO...
            </div>
          </div>
        ) : (
          <div className="dashboard-grid animate-fade-in">

            {/* ── Fresh Start banners (aparecem apenas nos dias certos) ─────── */}
            {(isMonday || isMonthStart) && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '4px' }}>
                {isMonday && (
                  <div style={{
                    padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(34, 184, 207, 0.07)',
                    border: '1px solid rgba(34, 184, 207, 0.18)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-teal)', fontSize: '20px', flexShrink: 0 }}>refresh</span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                      Nova semana, novo ponto de partida. O que ficou pra trás, fica pra trás.
                    </p>
                  </div>
                )}
                {isMonthStart && (
                  <div style={{
                    padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(47, 158, 92, 0.07)',
                    border: '1px solid rgba(47, 158, 92, 0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-green)', fontSize: '20px', flexShrink: 0 }}>calendar_month</span>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                        Início de mês — bom momento pra olhar suas metas de novo.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/goals')}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-forge-green)', fontFamily: 'var(--font-mono)',
                        fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase',
                        whiteSpace: 'nowrap', padding: '4px 0',
                      }}
                    >
                      Ver metas
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Column 1: Focus Dial, Journal, and Weekly Review */}
            <div className="dashboard-col">
              {/* FOCUS DIAL CARD */}
              <section className="glass-panel animate-fade-in-up stagger-1" style={{ padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <div style={{ position: 'relative', width: '196px', height: '196px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
                    <g ref={dialRef} />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(34, 184, 207, 0.1)" strokeWidth="4" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke="var(--color-forge-teal)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    />
                  </svg>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 500, lineHeight: 1, marginBottom: '4px' }}>
                      {data.ritualsToday}/{data.ritualsTotal}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      RITUAIS HOJE
                    </div>
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', textAlign: 'center', maxWidth: '200px' }}>
                  {progressRatio >= 1
                    ? '🔥 Todos os rituais concluídos!'
                    : progressRatio >= 0.5
                    ? 'Você está trancado no foco de hoje.'
                    : `Bom dia, ${user?.name?.split(' ')[0] ?? 'agente'}. Vamos forjar hoje.`
                  }
                </p>
              </section>

              {/* JOURNAL ENTRY */}
              <section className="animate-fade-in-up stagger-4" style={{ width: '100%' }}>
                <div
                  className="glass-panel ghost-border"
                  style={{ padding: '20px', borderRadius: '12px', cursor: 'pointer' }}
                  onClick={() => navigate('/journal/new')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '22px' }}>auto_stories</span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600 }}>Diário</h3>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', marginBottom: '16px', lineHeight: 1.6 }}>
                    {data.hasJournalToday
                      ? 'Você já escreveu hoje. Quer adicionar mais?'
                      : 'O que travou seu foco hoje — e o que destravou?'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.5 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.05em' }}>privado e criptografado</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-teal)', fontSize: '20px' }}>
                      {data.hasJournalToday ? 'check_circle' : 'add_circle'}
                    </span>
                  </div>
                </div>
              </section>

              {/* WEEKLY REVIEW */}
              {isSunday && (
                <button className="btn-orange animate-fade-in-up" onClick={() => navigate('/review')} style={{ width: '100%' }}>
                  <span>Domingo é dia de revisão semanal</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              )}
            </div>

            {/* Column 2: Goals, Habits, and Pro Teaser */}
            <div className="dashboard-col">
              {/* GOALS SECTION */}
              {data.goals.length > 0 && (
                <section className="animate-fade-in-up stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', marginBottom: '4px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-teal)', fontSize: '18px' }}>target</span>
                    <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-on-surface-variant)' }}>Metas em Foco</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.goals.map((goal) => (
                      <div
                        key={goal.id}
                        className="glass-panel ghost-border"
                        style={{ padding: '16px', borderRadius: '12px', cursor: 'pointer' }}
                        onClick={() => navigate(`/goals/${goal.id}`)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, flex: 1, marginRight: '8px' }}>{goal.title}</h3>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-forge-teal)', flexShrink: 0 }}>{goal.progress}%</span>
                        </div>
                        <div className="progress-bar" style={{ marginBottom: '10px' }}>
                          <div className="progress-fill" style={{ width: `${goal.progress}%` }} />
                        </div>
                        {goal.ifThenPlan && (
                          <div className="tag-chip">
                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>bolt</span>
                            {goal.ifThenPlan}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/goals')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-forge-teal)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 4px', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}
                  >
                    Ver todas <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                  </button>
                </section>
              )}

              {/* HABITS SECTION */}
              {data.habits.length > 0 && (
                <section className="animate-fade-in-up stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', marginBottom: '4px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-green)', fontSize: '18px' }}>cached</span>
                    <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-on-surface-variant)' }}>Hábitos de Hoje</h2>
                  </div>
                  <div className="glass-panel ghost-border" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                    {data.habits.map((habit, i) => (
                      <div
                        key={habit.id}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '16px',
                          borderBottom: i < data.habits.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <button
                            className={`habit-check ${habit.completedToday ? 'checked' : ''}`}
                            onClick={() => toggleHabit(habit.id, habit.completedToday)}
                            aria-label={`Marcar ${habit.title}`}
                          >
                            {habit.completedToday && (
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>check</span>
                            )}
                          </button>
                          <div>
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, textDecoration: habit.completedToday ? 'line-through' : 'none', opacity: habit.completedToday ? 0.6 : 1 }}>{habit.title}</p>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                              {habit.consistency}% nos últimos 30 dias
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* COACH IA SECTION */}
              <section className="animate-fade-in-up stagger-5" style={{ width: '100%' }}>
                {insightLoading ? (
                  <div
                    className="glass-panel ghost-border"
                    style={{
                      padding: '24px',
                      borderRadius: '12px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--color-on-surface-variant)',
                      letterSpacing: '0.05em'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--color-primary)' }}>autorenew</span>
                      <span>PROCESSANDO MÉTRICAS...</span>
                    </div>
                  </div>
                ) : insightLocked ? (
                  <div
                    className="glass-panel ghost-border"
                    style={{
                      padding: '24px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(255,182,148,0.03) 0%, rgba(20,18,26,0.5) 100%)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-tertiary)', fontSize: '22px' }}>auto_awesome</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>Coach IA — resumo semanal</span>
                      </div>
                      <div style={{ padding: '2px 8px', background: 'var(--color-input-bg)', border: '1px solid rgba(255,182,148,0.2)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '12px', color: 'var(--color-tertiary)' }}>lock</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-tertiary)' }}>PRO</span>
                      </div>
                    </div>
                    
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', marginBottom: '20px' }}>
                      Análise profunda de hábitos, consistência e metas sem expor o conteúdo privado do diário. Receba planos de contingência automáticos toda semana.
                    </p>

                    <button
                      onClick={handleUpgradeToggle}
                      disabled={isUpgrading}
                      className="btn-primary"
                      style={{
                        padding: '10px 16px',
                        fontSize: '12px',
                        background: 'var(--color-tertiary-container)',
                        color: 'var(--color-on-tertiary-container)'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>workspace_premium</span>
                      {isUpgrading ? 'ATIVANDO...' : 'Ativar Forge Pro (Simulação)'}
                    </button>
                  </div>
                ) : (
                  <div
                    className="glass-panel ghost-border animate-fade-in"
                    style={{
                      padding: '24px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(83,215,239,0.06) 0%, rgba(20,18,26,0.8) 100%)',
                      border: '1px solid rgba(83, 215, 239, 0.15)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '22px' }}>auto_awesome</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em' }}>Coach IA — insight semanal</span>
                      </div>
                      <button
                        onClick={handleUpgradeToggle}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-on-surface-variant)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          cursor: 'pointer',
                          opacity: 0.5,
                          textDecoration: 'underline'
                        }}
                      >
                        [Voltar para Free]
                      </button>
                    </div>

                    {insight && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Highlight Badge */}
                        <div style={{ display: 'flex' }}>
                          <span
                            className="tag-chip"
                            style={{
                              background: 'rgba(113, 220, 147, 0.1)',
                              border: '1px solid rgba(113, 220, 147, 0.2)',
                              color: 'var(--color-secondary)',
                              fontStyle: 'normal',
                              fontWeight: 500
                            }}
                          >
                            ⭐ {insight.highlight}
                          </span>
                        </div>

                        {/* Summary */}
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.6, color: 'var(--color-on-surface)' }}>
                          {insight.summary}
                        </p>

                        {/* Action Plan Suggestion */}
                        <div
                          style={{
                            padding: '14px 18px',
                            background: 'rgba(33, 30, 39, 0.8)',
                            borderLeft: '3px solid var(--color-primary)',
                            borderRadius: '4px 8px 8px 4px'
                          }}
                        >
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                            Plano sugerido pela IA
                          </span>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.5, color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                            "{insight.suggestion}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
