import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../store/authStore'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError(null)
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err: unknown) {
      console.error('Login error details:', err);
      if (!window.navigator.onLine) {
        setApiError('Sem conexão com a internet. Verifique sua rede e tente novamente.');
        return;
      }
      const axiosErr = err as { response?: { data?: { message?: string } }, request?: unknown }
      if (!axiosErr.response && axiosErr.request) {
        setApiError('Não foi possível se conectar ao servidor. Verifique se o servidor está online.');
        return;
      }
      // Generic error: never reveal if email or password was wrong
      setApiError(axiosErr.response?.data?.message ?? 'Credenciais inválidas. Tente novamente.');
    }
  }

  return (
    <div className="auth-page">
      {/* Background radial glow */}
      <div className="radial-glow-teal" style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }} />

      <main className="auth-card">
        <div style={{
          background: 'var(--color-surface-container)',
          borderRadius: '0.75rem',
          padding: '32px 24px',
          border: '1px solid rgba(244, 239, 230, 0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.5rem',
              background: 'rgba(34, 184, 207, 0.1)',
              border: '1px solid rgba(34, 184, 207, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <span className="material-symbols-outlined material-symbols-filled" style={{ color: 'var(--color-forge-teal)', fontSize: '28px' }}>bolt</span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-on-surface)',
              textAlign: 'center',
            }}>FLAVOS FORGE</h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: 'var(--color-on-surface-variant)',
              textAlign: 'center',
              marginTop: '8px',
            }}>Entre no santuário do foco.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="email" style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-on-surface-variant)',
              }}>Email</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-on-surface-variant)', fontSize: '20px',
                  pointerEvents: 'none',
                }}>mail</span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="agent@flavos.com"
                  className="forge-input"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label htmlFor="password" style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--color-on-surface-variant)',
                }}>Senha</label>
                <Link to="/forgot-password" style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-forge-teal)',
                  textDecoration: 'none',
                }}>Esqueci minha senha</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-on-surface-variant)', fontSize: '20px',
                  pointerEvents: 'none',
                }}>lock</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="forge-input"
                  style={{ paddingRight: '48px' }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-on-surface-variant)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {errors.password && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* API Error */}
            {apiError && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(147, 0, 10, 0.15)',
                border: '1px solid rgba(255, 180, 171, 0.2)',
                borderRadius: '0.5rem',
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-error)' }}>{apiError}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '8px' }}>
              {isLoading ? (
                <span style={{ opacity: 0.7 }}>Entrando...</span>
              ) : (
                <>
                  Entrar
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ou</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <Link to="/register" style={{ textDecoration: 'none' }}>
            <button type="button" className="btn-ghost">Criar conta</button>
          </Link>
        </div>
      </main>
    </div>
  )
}
