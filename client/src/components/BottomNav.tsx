import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'bolt', label: 'Forge' },
  { to: '/goals', icon: 'target', label: 'Metas' },
  { to: '/habits', icon: 'cached', label: 'Hábitos' },
  { to: '/journal', icon: 'edit_note', label: 'Diário' },
  { to: '/review', icon: 'calendar_view_week', label: 'Revisão' },
]

export default function BottomNav() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const activeStyle = (isActive: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: '2px',
    color: isActive ? 'var(--color-forge-teal)' : 'var(--color-on-surface-variant)',
    textDecoration: 'none',
    transition: 'color 0.2s',
    padding: '4px 6px',
    minWidth: '44px',
    position: 'relative' as const,
  })

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-content">

        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => activeStyle(isActive)}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`material-symbols-outlined ${isActive ? 'material-symbols-filled' : ''}`}
                  style={{ fontSize: '22px', transition: 'font-variation-settings 0.2s' }}
                >
                  {item.icon}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  transition: 'opacity 0.2s',
                  opacity: isActive ? 1 : 0.7,
                }}>
                  {item.label}
                </span>
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '20px',
                    height: '2px',
                    borderRadius: '9999px',
                    background: 'var(--color-forge-teal)',
                  }} />
                )}
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            color: 'var(--color-on-surface-variant)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.2s',
            padding: '4px 6px',
            minWidth: '44px',
            opacity: 0.7,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-error)'
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-on-surface-variant)'
            ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.7'
          }}
          title="Sair da conta"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>logout</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Sair
          </span>
        </button>

      </div>
    </nav>
  )
}
