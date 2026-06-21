import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TopHeader from '../components/TopHeader'
import api from '../lib/api'

const actionPlanSchema = z.object({
  triggerCue: z.string().min(3, 'Gatilho muito curto').max(200),
  action: z.string().min(3, 'Ação muito curta').max(200),
})

const schema = z.object({
  title: z.string().min(3, 'Título muito curto').max(100, 'Título muito longo'),
  specificOutcome: z.string().min(5, 'Descreva o resultado esperado').max(500),
  metric: z.string().max(100, 'Métrica muito longa').optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'extreme']),
  deadline: z.string().optional(),
  actionPlans: z.array(actionPlanSchema).min(1, 'Adicione ao menos um plano Se-Então'),
})

type FormData = z.infer<typeof schema>

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Fácil', color: 'var(--color-forge-green)' },
  { value: 'medium', label: 'Moderada', color: 'var(--color-forge-teal)' },
  { value: 'hard', label: 'Difícil', color: 'var(--color-forge-orange)' },
  { value: 'extreme', label: 'Extrema', color: 'var(--color-error)' },
]

export default function NewGoalPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium')
  const [actionPlans, setActionPlans] = useState([{ triggerCue: '', action: '' }])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      difficulty: 'medium',
      actionPlans: [{ triggerCue: '', action: '' }],
    },
  })

  const addActionPlan = () => {
    const next = [...actionPlans, { triggerCue: '', action: '' }]
    setActionPlans(next)
    setValue('actionPlans', next)
  }

  const updateActionPlan = (idx: number, field: 'triggerCue' | 'action', value: string) => {
    const next = actionPlans.map((ap, i) => i === idx ? { ...ap, [field]: value } : ap)
    setActionPlans(next)
    setValue('actionPlans', next)
  }

  const removeActionPlan = (idx: number) => {
    if (actionPlans.length === 1) return
    const next = actionPlans.filter((_, i) => i !== idx)
    setActionPlans(next)
    setValue('actionPlans', next)
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setApiError(null)
    try {
      await api.post('/goals', {
        title: data.title,
        specificOutcome: data.specificOutcome,
        metric: data.metric || undefined,
        difficulty: data.difficulty,
        deadline: data.deadline || undefined,
        actionPlans: actionPlans.filter(ap => ap.triggerCue && ap.action),
      })
      navigate('/goals')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setApiError(axiosErr.response?.data?.message ?? 'Erro ao criar meta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const labelStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-on-surface-variant)',
  }

  return (
    <div className="app-shell" style={{ background: 'var(--color-background)' }}>
      <TopHeader title="Nova Meta" onBack={() => navigate(-1)} />

      <main className="app-main-wide">
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>Forjar Meta</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', marginTop: '6px', lineHeight: 1.5 }}>
            Defina com clareza. Um plano Se-Então aumenta em até 3× a execução.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="title" style={labelStyle}>Título da meta *</label>
            <input id="title" type="text" placeholder="Ex: Lançar o Forge em 90 dias"
              className="forge-input" style={{ paddingLeft: '16px' }} {...register('title')} />
            {errors.title && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>{errors.title.message}</span>}
          </div>

          {/* Specific Outcome */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="specificOutcome" style={labelStyle}>Resultado específico *</label>
            <textarea id="specificOutcome" rows={3}
              placeholder="O que exatamente você vai alcançar? Seja específico e mensurável."
              className="forge-textarea" {...register('specificOutcome')} />
            {errors.specificOutcome && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>{errors.specificOutcome.message}</span>}
          </div>

          {/* Metric */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="metric" style={labelStyle}>Como você vai medir? (opcional)</label>
            <input id="metric" type="text" placeholder="Ex: 1.000 usuários cadastrados, R$10k MRR"
              className="forge-input" style={{ paddingLeft: '16px' }} {...register('metric')} />
          </div>

          {/* Difficulty */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={labelStyle}>Dificuldade</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {DIFFICULTY_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => { setSelectedDifficulty(opt.value); setValue('difficulty', opt.value as FormData['difficulty']) }}
                  style={{
                    padding: '12px', borderRadius: '10px',
                    border: `1px solid ${selectedDifficulty === opt.value ? opt.color : 'rgba(255,255,255,0.08)'}`,
                    background: selectedDifficulty === opt.value ? `${opt.color}15` : 'var(--color-input-bg)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500,
                    color: selectedDifficulty === opt.value ? opt.color : 'var(--color-on-surface-variant)',
                    transition: 'all 0.2s',
                  }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Action Plans */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={labelStyle}>Planos Se-Então *</span>
              <button type="button" onClick={addActionPlan}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-forge-teal)', fontFamily: 'var(--font-mono)',
                  fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                Adicionar
              </button>
            </div>

            {/* Info */}
            <div style={{
              padding: '12px 16px', borderRadius: '10px',
              background: 'rgba(34, 184, 207, 0.06)',
              border: '1px solid rgba(34, 184, 207, 0.15)',
              display: 'flex', gap: '10px',
            }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-teal)', fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>info</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--color-forge-teal)' }}>Se [gatilho/situação],</strong> então <strong style={{ color: 'var(--color-forge-teal)' }}>[ação específica].</strong>
              </p>
            </div>

            {actionPlans.map((ap, idx) => (
              <div key={idx} className="ghost-border" style={{
                borderRadius: '12px', padding: '16px',
                background: 'var(--color-input-bg)',
                display: 'flex', flexDirection: 'column', gap: '10px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-forge-teal)', letterSpacing: '0.1em' }}>
                    PLANO {idx + 1}
                  </span>
                  {actionPlans.length > 1 && (
                    <button type="button" onClick={() => removeActionPlan(idx)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ ...labelStyle, fontSize: '10px' }}>Gatilho (SE...)</label>
                  <input type="text" placeholder="Ex: 9h da manhã, após o café"
                    value={ap.triggerCue}
                    onChange={e => updateActionPlan(idx, 'triggerCue', e.target.value)}
                    className="forge-input" style={{ paddingLeft: '16px', fontSize: '14px', padding: '10px 14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ ...labelStyle, fontSize: '10px' }}>Ação (ENTÃO...)</label>
                  <input type="text" placeholder="Ex: abro o editor e trabalho por 25 min"
                    value={ap.action}
                    onChange={e => updateActionPlan(idx, 'action', e.target.value)}
                    className="forge-input" style={{ paddingLeft: '16px', fontSize: '14px', padding: '10px 14px' }} />
                </div>
              </div>
            ))}
            {errors.actionPlans && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>
                {typeof errors.actionPlans === 'object' && 'message' in errors.actionPlans
                  ? errors.actionPlans.message as string
                  : 'Verifique os planos Se-Então'}
              </span>
            )}
          </div>

          {/* Deadline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="deadline" style={labelStyle}>Data limite (opcional)</label>
            <input id="deadline" type="date" className="forge-input"
              style={{ paddingLeft: '16px', colorScheme: 'dark' }} {...register('deadline')} />
          </div>

          {apiError && (
            <div style={{ padding: '12px 16px', background: 'rgba(147, 0, 10, 0.15)', border: '1px solid rgba(255, 180, 171, 0.2)', borderRadius: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-error)' }}>{apiError}</p>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: '8px' }}>
            {isSubmitting ? 'Forjando...' : (
              <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span> Forjar Meta</>
            )}
          </button>

          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
        </form>
      </main>
    </div>
  )
}
