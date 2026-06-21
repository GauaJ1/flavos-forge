import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import TopHeader from '../components/TopHeader'
import api from '../lib/api'

const schema = z.object({
  title: z.string().min(2, 'Título muito curto').max(100, 'Título muito longo'),
  cue: z.string().max(200, 'Muito longo').optional(),
})

type FormData = z.infer<typeof schema>


export default function NewHabitPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setApiError(null)
    try {
      await api.post('/habits', {
        title: data.title,
        cue: data.cue || undefined,
      })
      navigate('/habits')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setApiError(axiosErr.response?.data?.message ?? 'Erro ao criar hábito.')
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
      <TopHeader title="Novo Hábito" onBack={() => navigate(-1)} />

      <main className="app-main-wide">
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}>Forjar Hábito</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', marginTop: '6px', lineHeight: 1.5 }}>
            Pequeno e consistente supera grande e esporádico.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="title" style={labelStyle}>Nome do hábito *</label>
            <input
              id="title"
              type="text"
              placeholder="Ex: Meditação matinal"
              className="forge-input"
              style={{ paddingLeft: '16px' }}
              {...register('title')}
            />
            {errors.title && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>{errors.title.message}</span>}
          </div>

          {/* If-Then Plan / Cue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="cue" style={labelStyle}>Plano Se-Então (deixa/gatilho)</label>
            <input
              id="cue"
              type="text"
              placeholder='Se [contexto], então [hábito]'
              className="forge-input"
              style={{ paddingLeft: '16px' }}
              {...register('cue')}
            />
            {errors.cue && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>{errors.cue.message}</span>}
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
              Ex: "Se terminar o jantar, então 10 min de meditação"
            </p>
          </div>

          {/* Behavioral note */}
          <div style={{
            padding: '12px 16px', borderRadius: '10px',
            background: 'rgba(47, 158, 92, 0.06)',
            border: '1px solid rgba(47, 158, 92, 0.15)',
            display: 'flex', gap: '10px',
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-green)', fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>psychology</span>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
              Consistência em 30 dias, sem punição por falhas. O que importa é a tendência, não a perfeição.
            </p>
          </div>

          {apiError && (
            <div style={{ padding: '12px 16px', background: 'rgba(147, 0, 10, 0.15)', border: '1px solid rgba(255, 180, 171, 0.2)', borderRadius: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-error)' }}>{apiError}</p>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: '8px', backgroundColor: 'var(--color-forge-green)', color: '#fff' }}>
            {isSubmitting ? 'Criando...' : <>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cached</span>
              Criar Hábito
            </>}
          </button>

          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Cancelar</button>
        </form>
      </main>
    </div>
  )
}
