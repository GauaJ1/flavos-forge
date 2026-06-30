import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TopHeader from '../components/TopHeader'
import api from '../lib/api'
import { useToast } from '../hooks/useToast'

interface ActionPlan {
  id?: string
  triggerCue: string
  action: string
}

interface GoalDetail {
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

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Fácil', color: 'var(--color-forge-green)' },
  { value: 'medium', label: 'Moderada', color: 'var(--color-forge-teal)' },
  { value: 'hard', label: 'Difícil', color: 'var(--color-forge-orange)' },
  { value: 'extreme', label: 'Extrema', color: 'var(--color-error)' },
]

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [goal, setGoal] = useState<GoalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [checkInNote, setCheckInNote] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [showCheckIn, setShowCheckIn] = useState(false)

  // Edit form state
  const [form, setForm] = useState({
    title: '',
    specificOutcome: '',
    metric: '',
    difficulty: 'medium',
    deadline: '',
    status: 'ACTIVE',
    actionPlans: [{ triggerCue: '', action: '' }] as ActionPlan[],
    expectedCheckIns: '' as string | number,
  })

  useEffect(() => {
    if (!id) return
    api.get(`/goals/${id}`)
      .then(res => {
        const g = res.data?.goal
        setGoal(g)
        setForm({
          title: g.title,
          specificOutcome: g.specificOutcome,
          metric: g.metric ?? '',
          difficulty: g.difficulty,
          deadline: g.deadline ? g.deadline.split('T')[0] : '',
          status: g.status,
          actionPlans: g.actionPlans.length > 0 ? g.actionPlans : [{ triggerCue: '', action: '' }],
          expectedCheckIns: g.expectedCheckIns ?? '',
        })
      })
      .catch(() => navigate('/goals'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const getDifficultyColor = (difficulty: string) => {
    return DIFFICULTY_OPTIONS.find(d => d.value === difficulty)?.color ?? 'var(--color-forge-teal)'
  }

  const getDifficultyLabel = (difficulty: string) => {
    return DIFFICULTY_OPTIONS.find(d => d.value === difficulty)?.label ?? difficulty
  }

  const { showToast, ToastEl } = useToast()

  const handleSave = async () => {
    if (!id || saving) return
    setSaving(true)
    try {
      // Detectar se expectedCheckIns está sendo definido pela primeira vez
      const hadNoExpectedCheckIns = goal?.expectedCheckIns == null
      const willHaveExpectedCheckIns = form.expectedCheckIns !== '' && form.expectedCheckIns != null

      const payload: any = {
        title: form.title,
        specificOutcome: form.specificOutcome,
        metric: form.metric || undefined,
        difficulty: form.difficulty,
        status: form.status,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        actionPlans: form.actionPlans.filter(ap => ap.triggerCue.trim() && ap.action.trim()),
        expectedCheckIns: form.expectedCheckIns ? Number(form.expectedCheckIns) : null,
      }
      const res = await api.put(`/goals/${id}`, payload)
      setGoal(prev => ({ ...prev!, ...res.data.goal }))
      setEditing(false)

      if (hadNoExpectedCheckIns && willHaveExpectedCheckIns) {
        showToast('Progresso recalculado com base no novo critério.', { icon: 'auto_graph', color: 'teal' })
      }
    } catch {
      // keep editing open
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || deleting) return
    setDeleting(true)
    try {
      await api.delete(`/goals/${id}`)
      navigate('/goals')
    } catch {
      setDeleting(false)
    }
  }

  const handleCheckIn = async () => {
    if (!id || checkingIn) return
    setCheckingIn(true)
    try {
      const res = await api.post(`/goals/${id}/checkin`, { note: checkInNote || undefined })
      setGoal(prev => prev ? {
        ...prev,
        checkIns: [res.data.checkIn, ...prev.checkIns],
      } : prev)
      setCheckInNote('')
      setShowCheckIn(false)
    } catch {
      // no-op
    } finally {
      setCheckingIn(false)
    }
  }

  const addActionPlan = () => {
    setForm(prev => ({ ...prev, actionPlans: [...prev.actionPlans, { triggerCue: '', action: '' }] }))
  }

  const removeActionPlan = (i: number) => {
    setForm(prev => ({ ...prev, actionPlans: prev.actionPlans.filter((_, idx) => idx !== i) }))
  }

  const updatePlan = (i: number, field: 'triggerCue' | 'action', value: string) => {
    setForm(prev => ({
      ...prev,
      actionPlans: prev.actionPlans.map((ap, idx) => idx === i ? { ...ap, [field]: value } : ap),
    }))
  }

  if (loading) {
    return (
      <div className="app-shell" style={{ background: 'var(--color-background)' }}>
        <TopHeader title="Meta" onBack={() => navigate('/goals')} />
        <main className="app-main">
          <div style={{ textAlign: 'center', paddingTop: '80px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.1em' }}>
            CARREGANDO...
          </div>
        </main>
      </div>
    )
  }

  if (!goal) return null

  const diffColor = getDifficultyColor(goal.difficulty)

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)' }}>
      {ToastEl}
      <TopHeader
        title={editing ? 'Editando meta' : 'Meta'}
        onBack={() => editing ? setEditing(false) : navigate('/goals')}
      />

      <main className="app-main-wide" style={{ paddingBottom: '48px' }}>

        {editing ? (
          /* ─── EDIT MODE ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                Título da meta *
              </label>
              <input
                className="forge-input"
                style={{ paddingLeft: '1rem' }}
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Correr meia maratona"
                maxLength={120}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                Resultado específico *
              </label>
              <textarea
                className="forge-textarea"
                value={form.specificOutcome}
                onChange={e => setForm(p => ({ ...p, specificOutcome: e.target.value }))}
                rows={3}
                maxLength={500}
                placeholder="O que exatamente você quer alcançar?"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                  Dificuldade
                </label>
                <select
                  className="forge-select"
                  value={form.difficulty}
                  onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}
                >
                  {DIFFICULTY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                  Status
                </label>
                <select
                  className="forge-select"
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                >
                  <option value="ACTIVE">Ativa</option>
                  <option value="COMPLETED">Concluída</option>
                  <option value="ARCHIVED">Arquivada</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                Prazo
              </label>
              <input
                className="forge-input"
                style={{ paddingLeft: '1rem' }}
                type="date"
                value={form.deadline}
                onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '8px' }}>
                Check-ins esperados até o prazo (opcional)
              </label>
              <input
                className="forge-input"
                style={{ paddingLeft: '1rem' }}
                type="number"
                min={1}
                value={form.expectedCheckIns}
                onChange={e => setForm(p => ({ ...p, expectedCheckIns: e.target.value }))}
                placeholder="Ex: 20"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
                  Planos Se-Então
                </label>
                <button onClick={addActionPlan} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-forge-teal)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.06em' }}>
                  + Adicionar
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {form.actionPlans.map((ap, i) => (
                  <div key={i} className="glass-panel ghost-border" style={{ padding: '12px', borderRadius: '10px' }}>
                    <input
                      className="forge-input"
                      style={{ paddingLeft: '1rem', marginBottom: '8px', fontSize: '14px' }}
                      placeholder="Se... (gatilho/obstáculo)"
                      value={ap.triggerCue}
                      onChange={e => updatePlan(i, 'triggerCue', e.target.value)}
                      maxLength={200}
                    />
                    <input
                      className="forge-input"
                      style={{ paddingLeft: '1rem', fontSize: '14px' }}
                      placeholder="Então... (ação específica)"
                      value={ap.action}
                      onChange={e => updatePlan(i, 'action', e.target.value)}
                      maxLength={200}
                    />
                    {form.actionPlans.length > 1 && (
                      <button
                        onClick={() => removeActionPlan(i)}
                        style={{ marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancelar</button>
              <button
                className="btn-primary"
                style={{ flex: 2 }}
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.specificOutcome.trim()}
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>

        ) : (
          /* ─── VIEW MODE ─── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Goal header */}
            <div className="glass-panel ghost-border" style={{ padding: '20px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{
                    display: 'inline-block', marginBottom: '8px',
                    fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: diffColor,
                    padding: '2px 8px', borderRadius: '4px',
                    background: `${diffColor}18`, border: `1px solid ${diffColor}30`,
                  }}>
                    {getDifficultyLabel(goal.difficulty)}
                  </span>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                    {goal.title}
                  </h1>
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

              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: goal.deadline ? '12px' : 0 }}>
                {goal.specificOutcome}
              </p>

              {goal.deadline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>calendar_today</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                    Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}

              {/* Status badge */}
              <div style={{ marginTop: '12px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: '4px',
                  background: goal.status === 'ACTIVE' ? 'rgba(47,158,92,0.12)' : 'rgba(255,255,255,0.06)',
                  color: goal.status === 'ACTIVE' ? 'var(--color-forge-green)' : 'var(--color-on-surface-variant)',
                  border: `1px solid ${goal.status === 'ACTIVE' ? 'rgba(47,158,92,0.25)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  {goal.status === 'ACTIVE' ? 'Ativa' : goal.status === 'COMPLETED' ? 'Concluída' : 'Arquivada'}
                </span>
              </div>
            </div>

            {/* Action plans */}
            {goal.actionPlans.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-teal)', fontSize: '16px' }}>bolt</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>
                    Planos Se-Então
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {goal.actionPlans.map((ap, i) => (
                    <div key={i} className="glass-panel ghost-border" style={{ padding: '14px 16px', borderRadius: '12px' }}>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: 1.6 }}>
                        <span style={{ color: 'var(--color-forge-teal)', fontWeight: 600 }}>Se</span>{' '}
                        {ap.triggerCue}
                        {', '}
                        <span style={{ color: 'var(--color-forge-green)', fontWeight: 600 }}>então</span>{' '}
                        {ap.action}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Check-in section */}
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-orange)', fontSize: '16px' }}>task_alt</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)' }}>
                    Check-ins ({goal.checkIns.length})
                  </span>
                </div>
                {goal.status === 'ACTIVE' && (
                  <button
                    onClick={() => setShowCheckIn(p => !p)}
                    style={{
                      background: 'rgba(255, 122, 51, 0.1)', border: '1px solid rgba(255, 122, 51, 0.25)',
                      borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-forge-orange)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                    Novo
                  </button>
                )}
              </div>

              {showCheckIn && (
                <div className="glass-panel ghost-border" style={{ padding: '14px', borderRadius: '12px', marginBottom: '12px' }}>
                  <textarea
                    className="forge-textarea"
                    value={checkInNote}
                    onChange={e => setCheckInNote(e.target.value)}
                    placeholder="Como está o progresso? O que foi feito? (opcional)"
                    rows={3}
                    maxLength={1000}
                    style={{ marginBottom: '10px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-ghost" style={{ flex: 1, padding: '10px' }} onClick={() => setShowCheckIn(false)}>Cancelar</button>
                    <button
                      className="btn-primary"
                      style={{ flex: 2, padding: '10px', background: 'var(--color-forge-orange)', color: '#fff' }}
                      onClick={handleCheckIn}
                      disabled={checkingIn}
                    >
                      {checkingIn ? 'Registrando...' : 'Registrar check-in'}
                    </button>
                  </div>
                </div>
              )}

              {goal.checkIns.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', borderRadius: '12px', background: 'rgba(255,122,51,0.04)', border: '1px solid rgba(255,122,51,0.1)' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', letterSpacing: '0.05em' }}>
                    Nenhum check-in ainda. Registre seu primeiro progresso!
                  </p>
                </div>
              ) : (
                <div className="glass-panel ghost-border" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                  {goal.checkIns.slice(0, 10).map((ci, i) => (
                    <div key={ci.id} style={{
                      padding: '12px 16px',
                      borderBottom: i < Math.min(goal.checkIns.length, 10) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-on-surface)', lineHeight: 1.5, flex: 1 }}>
                          {ci.note ?? <span style={{ color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>Check-in sem nota</span>}
                        </p>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                          {new Date(ci.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Danger zone */}
            <section style={{ marginTop: '12px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {confirmDelete ? (
                <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 71, 87, 0.25)', background: 'rgba(255,71,87,0.06)' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: '14px', lineHeight: 1.5 }}>
                    Tem certeza? Essa ação não pode ser desfeita.
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
                      {deleting ? 'Excluindo...' : 'Sim, excluir meta'}
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
                  Excluir meta
                </button>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
