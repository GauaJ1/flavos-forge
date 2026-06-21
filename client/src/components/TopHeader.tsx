import { useAuthStore } from '../store/authStore'

interface Props {
  title?: string
  showAvatar?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
}

export default function TopHeader({ title, showAvatar = false, onBack, rightAction }: Props) {
  const { user } = useAuthStore()

  const colStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  }

  return (
    <header className="top-header">
      <div className="top-header-content">

        {/* Left — back button or brand */}
        <div style={colStyle}>
          {onBack ? (
            <button
              onClick={onBack}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-on-surface-variant)', padding: '4px',
                borderRadius: '8px', transition: 'color 0.2s',
              }}
              aria-label="Voltar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>arrow_back</span>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.2em',
                color: 'var(--color-on-surface-variant)',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}>FLAVOS</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--color-forge-teal)',
                lineHeight: 1.2,
              }}>
                {title || 'Forge'}
              </span>
            </div>
          )}
        </div>

        {/* Center — page title (only when in sub-page with back button) */}
        {onBack && title && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--color-on-surface)',
              whiteSpace: 'nowrap',
            }}>{title}</span>
          </div>
        )}

        {/* Right — avatar or custom action */}
        <div style={{ ...colStyle, justifyContent: 'flex-end' }}>
          {rightAction ?? (showAvatar && user ? (
            <div style={{
              width: '36px', height: '36px',
              borderRadius: '9999px',
              background: 'var(--color-input-bg)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--color-forge-teal)',
              }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          ) : null)}
        </div>

      </div>
    </header>
  )
}
