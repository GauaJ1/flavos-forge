import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '../lib/api'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      await api.post('/auth/recovery/request', { email: data.email })
    } catch {
      // intentionally silent — never reveal if email exists
    } finally {
      setIsLoading(false)
      setSent(true) // Always show success to prevent email enumeration
    }
  }

  return (
    <div className="auth-page">
      <div className="radial-glow-teal" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <main className="auth-card">
        <div style={{
          background: 'var(--color-surface-container)',
          borderRadius: '0.75rem',
          padding: '32px 24px',
          border: '1px solid rgba(244, 239, 230, 0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '0.5rem',
              background: 'rgba(34, 184, 207, 0.1)',
              border: '1px solid rgba(34, 184, 207, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
            }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-forge-teal)', fontSize: '28px' }}>key</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-on-surface)', textAlign: 'center' }}>
              Recuperar Acesso
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', textAlign: 'center', marginTop: '8px', lineHeight: 1.6 }}>
              Informe seu e-mail e enviaremos instruções de recuperação.
            </p>
          </div>

          {sent ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
              <span className="material-symbols-outlined material-symbols-filled" style={{ fontSize: '48px', color: 'var(--color-forge-green)' }}>mark_email_read</span>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Verifique seu e-mail</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                  Se esse e-mail estiver cadastrado, você receberá as instruções em breve.
                </p>
              </div>
              <Link to="/login" style={{ textDecoration: 'none', width: '100%' }}>
                <button className="btn-ghost">Voltar ao login</button>
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="email" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
                    Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', fontSize: '20px', pointerEvents: 'none' }}>mail</span>
                    <input id="email" type="email" autoComplete="email" placeholder="agent@flavos.com" className="forge-input" {...register('email')} />
                  </div>
                  {errors.email && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>{errors.email.message}</span>}
                </div>

                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : <>
                    Enviar instruções
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
                  </>}
                </button>
              </form>

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Link to="/login" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-on-surface-variant)', textDecoration: 'none' }}>
                  ← Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
