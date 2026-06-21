import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../store/authStore'

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(50, 'Nome muito longo'),
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Precisa de ao menos um número'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: authRegister, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError(null)
    try {
      await authRegister(data.name, data.email, data.password)
      navigate('/dashboard')
    } catch (err: unknown) {
      console.error('Registration error details:', err);
      if (!window.navigator.onLine) {
        setApiError('Sem conexão com a internet. Verifique sua rede e tente novamente.');
        return;
      }
      const axiosErr = err as { response?: { data?: { message?: string } }, request?: unknown }
      if (!axiosErr.response && axiosErr.request) {
        setApiError('Não foi possível se conectar ao servidor. Verifique se o servidor está online.');
        return;
      }
      setApiError(axiosErr.response?.data?.message ?? 'Erro ao criar conta. Tente novamente.');
    }
  }

  return (
    <div className="auth-page">
      <div className="radial-glow-green" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <main className="auth-card">
        <div style={{
          background: 'var(--color-surface-container)',
          borderRadius: '0.75rem',
          padding: '32px 24px',
          border: '1px solid rgba(244, 239, 230, 0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '0.5rem',
              background: 'rgba(47, 158, 92, 0.1)',
              border: '1px solid rgba(47, 158, 92, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
            }}>
              <span className="material-symbols-outlined material-symbols-filled" style={{ color: 'var(--color-forge-green)', fontSize: '28px' }}>person_add</span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--color-on-surface)', textAlign: 'center',
            }}>Criar Conta</h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-on-surface-variant)', textAlign: 'center', marginTop: '8px' }}>
              Comece sua jornada de 30 dias.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="name" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Nome</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', fontSize: '20px', pointerEvents: 'none' }}>person</span>
                <input id="name" type="text" autoComplete="name" placeholder="Seu nome" className="forge-input" {...register('name')} />
              </div>
              {errors.name && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>{errors.name.message}</span>}
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="email" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', fontSize: '20px', pointerEvents: 'none' }}>mail</span>
                <input id="email" type="email" autoComplete="email" placeholder="agent@flavos.com" className="forge-input" {...register('email')} />
              </div>
              {errors.email && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>{errors.email.message}</span>}
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="password" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', fontSize: '20px', pointerEvents: 'none' }}>lock</span>
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" className="forge-input" style={{ paddingRight: '48px' }} {...register('password')} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>{errors.password.message}</span>}
            </div>

            {/* Confirm Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="confirmPassword" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Confirmar Senha</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', fontSize: '20px', pointerEvents: 'none' }}>lock_reset</span>
                <input id="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" className="forge-input" {...register('confirmPassword')} />
              </div>
              {errors.confirmPassword && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-error)' }}>{errors.confirmPassword.message}</span>}
            </div>

            {apiError && (
              <div style={{ padding: '12px 16px', background: 'rgba(147, 0, 10, 0.15)', border: '1px solid rgba(255, 180, 171, 0.2)', borderRadius: '0.5rem' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-error)' }}>{apiError}</p>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '8px', backgroundColor: 'var(--color-forge-green)', color: '#fff' }}>
              {isLoading ? 'Criando conta...' : <>Criar conta <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span></>}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>já tenho conta</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <Link to="/login" style={{ textDecoration: 'none' }}>
            <button type="button" className="btn-ghost">Entrar</button>
          </Link>
        </div>
      </main>
    </div>
  )
}
