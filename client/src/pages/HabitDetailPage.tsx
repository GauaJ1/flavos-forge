import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TopHeader from '../components/TopHeader'
import api from '../lib/api'

interface CheckIn {
  id: string
  date: string
  completed: boolean
}

interface HabitDetail {
  id: string
  title: string
  cue?: string
  freezesUsed: number
  consistency: number
  createdAt: string
  checkIns: CheckIn[]
}

// Generate last N days (newest first)
function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  })
}

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [habit, setHabit] = useState<HabitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [freezing, setFreezing] = useState(false)

  const [form, setForm] = useState({ title: '', cue: '' })

  const today = new Date().toISOString().split('T')[0]
  const last30 = getLastNDays(30)

  useEffect(() => {
    if (!id) return
    api.get(`/habits/${id}`)
      .then(res => {
        const h = res.data?.habit
        setHabit(h)
        setForm({ title: h.title, cue: h.cue ?? '' })
      })
      .catch(() => navigate('/habits'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const isCompleted = (date: string) => {
    return habit?.checkIns.some(ci => ci.date.startsWith(date) && ci.completed) ?? false
  }

  const toggleToday = async () => {
    if (!id || toggling) return
    const currentState = isCompleted(today)
    setToggling(true)
    try {
      const res = await api.post(`/habits/${id}/checkin`, {
        date: today,
        completed: !currentState,
      })
      setHabit(prev => {
        if (!prev) return prev
        const existing = prev.checkIns.find(ci => ci.date.startsWith(today))
        let newCheckIns: CheckIn[]
        if (existing) {
          newCheckIns = prev.checkIns.map(ci =>
            ci.date.startsWith(today) ? { ...ci, completed: !currentState } : ci
          )
        } else {
          newCheckIns = [
            { id: res.data.checkIn?.id ?? Math.random().toString(), date: today, completed: true },
            ...prev.checkIns,
          ]
        }
        return { 
          ...prev, 
          checkIns: newCheckIns, 
          consistency: res.data.consistency ?? prev.consistency,
          freezesUsed: res.data.freezesUsed ?? prev.freezesUsed
        }
      })
    } catch {
      // no-op
    } finally {
      setToggling(false)
    }
  }

  const handleFreeze = async () => {
    if (!id || freezing) return
    setFreezing(true)
    try {
      const res = await api.post(`/habits/${id}/freeze`, { date: today })
      setHabit(prev => {
        if (!prev) return prev
        const existing = prev.checkIns.find(ci => ci.date.startsWith(today))
        let newCheckIns: CheckIn[]
        if (existing) {
          newCheckIns = prev.checkIns.map(ci =>
            ci.date.startsWith(today) ? { ...ci, completed: true } : ci
          )
        } else {
          newCheckIns = [
            { id: res.data.checkIn?.id ?? Math.random().toString(), date: today, completed: true },
            ...prev.checkIns,
          ]
        }
        return {
          ...prev,
          checkIns: newCheckIns,
          freezesUsed: res.data.freezesUsed ?? prev.freezesUsed + 1,
          consistency: res.data.consistency ?? prev.consistency,
        }
      })
    } catch {
      // no-op
    } finally {
      setFreezing(false)
    }
  }

  const handleSave = async () => {
    if (!id || saving) return
    setSaving(true)
    try {
      const res = await api.put(`/habits/${id}`, {
        title: form.title,
        cue: form.cue || undefined,
      })
      setHabit(prev => prev ? { ...prev, title: res.data.habit.title, cue: res.data.habit.cue, consistency: res.data.habit.consistency } : prev)
      setEditing(false)
    } catch {
      // keep open
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || deleting) return
    setDeleting(true)
    try {
      await api.delete(`/habits/${id}`)
      navigate('/habits')
    } catch {
      setDeleting(false)
    }
  }

  const getConsistencyColor = (rate: number) => {
    if (rate >= 80) return 'var(--color-forge-green)'
    if (rate >= 50) return 'var(--color-forge-teal)'
    return 'var(--color-forge-orange)'
  }

  if (loading) {
    return (
      <div className="app-shell" style={{ background: 'var(--color-background)' }}>
        <TopHeader title="Hábito" onBack={() => navigate('/habits')} />
        <main className="app-main">
          <div style={{ textAlign: 'center', paddingTop: '80px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.1em' }}>
            CARREGANDO...
          </div>
        </main>
      </div>
    )
  }

  if (!habit) return null

  const todayDone = isCompleted(today)
  const consistencyColor = getConsistencyColor(habit.consistency)

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)' }}>
      <TopHeader
        title={editing ? 'Editando hábito' : 'Hábito'}
        onBack={() => editing ? setEditing(false) : navigate('/habits')}
      />

      <main className="app-main" style={{ paddingBottom: '48px' }}>

        {editing ? (
          /* ─── EDIT MODE ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                Nome do hábito *
              </label>
              <input
                className="forge-input"
                style={{ paddingLeft: '1rem' }}
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Meditação matinal"
                maxLength={120}
              />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                Gatilho (cue) — opcional
              </label>
              <input
                className="forge-input"
                style={{ paddingLeft: '1rem' }}
                value={form.cue}
                onChange={e => setForm(p => ({ ...p, cue: e.target.value }))}
                placeholder="Ex: Depois de acordar, antes do café"
                maxLength={200}
              />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', marginTop: '6px', letterSpacing: '0.04em' }}>
                O gatilho que aciona este hábito (ajuda na formação de rotina)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancelar</button>
              <button
                className="btn-primary"
                style={{ flex: 2, background: 'var(--color-forge-green)', color: '#fff' }}
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>

        ) : (
          /* ─── VIEW MODE ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Header card */}
            <div className="glass-panel ghost-border" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                    {habit.title}
                  </h1>
                  {habit.cue && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-forge-teal)' }}>flash_on</span>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                        {habit.cue}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setEditing(true)}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '4px',
                    color: 'var(--color-on-surface-variant)', flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                </button>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ textAlign: 'center', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 500, color: consistencyColor, lineHeight: 1 }}>
                    {habit.consistency}%
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-on-surface-variant)', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Consistência
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 500, color: 'var(--color-forge-orange)', lineHeight: 1 }}>
                    {habit.freezesUsed}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-on-surface-variant)', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Congelados
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 500, color: 'var(--color-primary)', lineHeight: 1 }}>
                    {habit.checkIns.filter(ci => ci.completed).length}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-on-surface-variant)', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Concluídos
                  </div>
                </div>
              </div>
            </div>

            {/* Today's action */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-green)', fontSize: '16px' }}>today</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>
                  Hoje
                </span>
              </div>
              <div className="glass-panel ghost-border" style={{ padding: '16px', borderRadius: '14px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={toggleToday}
                  disabled={toggling}
                  style={{
                    flex: 1, padding: '12px',
                    background: todayDone ? 'rgba(47,158,92,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${todayDone ? 'rgba(47,158,92,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.06em',
                    color: todayDone ? 'var(--color-forge-green)' : 'var(--color-on-surface)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span className="material-symbols-outlined material-symbols-filled" style={{ fontSize: '18px', color: todayDone ? 'var(--color-forge-green)' : 'var(--color-on-surface-variant)' }}>
                    {todayDone ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  {todayDone ? 'Feito!' : 'Marcar como feito'}
                </button>

                {!todayDone && (
                  <button
                    onClick={handleFreeze}
                    disabled={freezing}
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(255,122,51,0.08)',
                      border: '1px solid rgba(255,122,51,0.2)',
                      borderRadius: '10px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em',
                      color: 'var(--color-forge-orange)',
                      transition: 'all 0.2s',
                    }}
                    title="Congelar hoje (free pass)"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>ac_unit</span>
                    {freezing ? '...' : 'Congelar'}
                  </button>
                )}
              </div>
              {!todayDone && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', marginTop: '6px', letterSpacing: '0.04em', textAlign: 'center' }}>
                  Congelar = free pass sem penalizar consistência
                </p>
              )}
            </section>

            {/* 30-day calendar */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '16px' }}>calendar_month</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>
                  Últimos 30 dias
                </span>
              </div>
              <div className="glass-panel ghost-border" style={{ padding: '14px', borderRadius: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '5px' }}>
                  {last30.reverse().map(date => {
                    const done = isCompleted(date)
                    const isToday = date === today
                    return (
                      <div
                        key={date}
                        title={`${date} — ${done ? 'Feito' : 'Não feito'}`}
                        style={{
                          aspectRatio: '1',
                          borderRadius: '5px',
                          background: done
                            ? 'var(--color-forge-green)'
                            : 'rgba(255,255,255,0.05)',
                          border: isToday ? '1px solid var(--color-forge-teal)' : 'none',
                          transition: 'background 0.2s',
                        }}
                      />
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--color-forge-green)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.06em' }}>Feito</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.06em' }}>Não feito</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Danger zone */}
            <section style={{ marginTop: '12px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {confirmDelete ? (
                <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,71,87,0.25)', background: 'rgba(255,71,87,0.06)' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: '14px', lineHeight: 1.5 }}>
                    Tem certeza? Isso vai apagar o hábito e todo seu histórico.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-ghost" style={{ flex: 1, padding: '10px' }} onClick={() => setConfirmDelete(false)}>Cancelar</button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{
                        flex: 2, padding: '10px',
                        background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.4)',
                        borderRadius: '8px', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#ff4757', letterSpacing: '0.06em',
                      }}
                    >
                      {deleting ? 'Excluindo...' : 'Sim, excluir hábito'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)',
                    display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em',
                    padding: '8px 0', opacity: 0.6, transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-error)' }}>delete</span>
                  Excluir hábito
                </button>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
