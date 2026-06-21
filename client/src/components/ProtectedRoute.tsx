import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function ProtectedRoute() {
  const { isAuthenticated, checkAuth } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Verify session with backend on every mount
    checkAuth().finally(() => setChecking(false))
  }, [checkAuth])

  if (checking) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          {/* Animated logo */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'rgba(34, 184, 207, 0.1)',
            border: '1px solid rgba(34, 184, 207, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}>
            <span
              className="material-symbols-outlined material-symbols-filled"
              style={{ fontSize: '32px', color: 'var(--color-forge-teal)' }}
            >bolt</span>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.2em',
            color: 'var(--color-on-surface-variant)',
            textTransform: 'uppercase',
          }}>Verificando sessão...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
