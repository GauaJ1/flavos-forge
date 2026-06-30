import { useState, useCallback, useRef } from 'react'

export interface ToastOptions {
  icon?: string
  duration?: number // ms, default 4000
  color?: 'green' | 'teal' | 'orange' | 'error'
}

export interface ToastState {
  message: string
  icon: string
  color: string
}

const COLOR_MAP: Record<string, string> = {
  green:  'rgba(47, 158, 92, 0.92)',
  teal:   'rgba(34, 184, 207, 0.85)',
  orange: 'rgba(255, 145, 77, 0.90)',
  error:  'rgba(147, 0, 10, 0.92)',
}

/**
 * Hook leve de toast — sem dependência nova, padrão igual ao já usado em
 * DashboardPage.tsx e HabitsPage.tsx.
 *
 * @example
 * const { toast, showToast, ToastEl } = useToast()
 * <ToastEl />
 * showToast('Progresso recalculado.', { color: 'teal', icon: 'info' })
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, opts: ToastOptions = {}) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({
      message,
      icon: opts.icon ?? 'check_circle',
      color: COLOR_MAP[opts.color ?? 'teal'],
    })
    timerRef.current = setTimeout(() => setToast(null), opts.duration ?? 4000)
  }, [])

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  const ToastEl = toast ? (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, maxWidth: '340px', width: 'calc(100% - 32px)',
        background: toast.color, backdropFilter: 'blur(8px)',
        color: '#fff', padding: '12px 16px', borderRadius: '12px',
        fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: 1.5,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', gap: '10px',
        animation: 'fadeInDown 0.2s ease',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '20px', flexShrink: 0 }}>
        {toast.icon}
      </span>
      <span>{toast.message}</span>
      <button
        onClick={dismissToast}
        style={{ background: 'none', border: 'none', color: '#fff', marginLeft: 'auto', cursor: 'pointer', opacity: 0.7 }}
        aria-label="Fechar"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
      </button>
    </div>
  ) : null

  return { toast, showToast, ToastEl }
}
