import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Moon, Sun, UploadCloud, Search, WandSparkles, BarChart3, LogOut, Loader2, Shield } from 'lucide-react'

import { useAuthStore } from '../store/auth'
import { useTheme } from '../hooks/useTheme'

const navItems = [
  { label: 'Home', to: '/', icon: UploadCloud },
  { label: 'Results', to: '/results', icon: Search },
  { label: 'Workspace', to: '/workspace', icon: WandSparkles },
  { label: 'Dashboard', to: '/dashboard', icon: BarChart3 },
]

export const AppLayout = () => {
  const { user, loginWithGoogle, logout, token, fetchProfile, isFetchingProfile } = useAuthStore()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()

  useEffect(() => {
    if (token && !user && !isFetchingProfile) {
      void fetchProfile()
    }
  }, [token, user, isFetchingProfile, fetchProfile])

  return (
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh' }}>
      <aside
        style={{
          background: 'var(--bg-sidebar)',
          color: 'white',
          padding: '2rem 1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Gradient Box Container */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                background: 'linear-gradient(140deg, #7c6dff, #51e1d3)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 12px 24px rgba(0,0,0,0.25)',
                color: 'white'
              }}
            >
              {/* Logo SVG */}
              <svg 
                viewBox="0 0 100 100" 
                fill="currentColor" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: '85%', height: '85%' }}
              >
                {/* 
                   Geometry Logic:
                   J Stem X: 40-52
                   F Stem X: 58-70
                   F stops at x=40 (aligns with J's back edge)
                */}

                {/* J: Smooth, bold curve */}
                <path d="M40 15 H52 V60 A24 24 0 0 1 4 60 L16 60 A12 12 0 0 0 40 60 V15 Z" />

                {/* F: Full letter with arms, curving tail that truncates at x=40 */}
                <path d="M58 15 H92 V27 H70 V38 H88 V50 H70 V60 A42 42 0 0 1 40 100 L40 88 A30 30 0 0 0 58 60 V15 Z" />
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.05em', fontSize: 18 }}>JobFlow AI</p>
              <p style={{ margin: 0, opacity: 0.8, fontSize: 13, letterSpacing: '0.08em' }}>Tailored Job Studio</p>
            </div>
          </div>
        </Link>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
                style={({ isActive }) => ({
                  textDecoration: 'none',
                  color: 'inherit',
                  borderRadius: 14,
                  padding: '0.8rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontWeight: 500,
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                })}
              >
                <Icon size={20} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 12,
              padding: '0.75rem 1rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          {user ? (
            <button
              onClick={logout}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: 12,
                padding: '0.75rem 1rem',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div>
                <strong style={{ display: 'block' }}>{user.name}</strong>
                <span style={{ opacity: 0.7, fontSize: 12 }}>{user.email}</span>
              </div>
              <LogOut size={16} />
            </button>
          ) : (
            <button className="accent-button" onClick={loginWithGoogle}>
              Connect Google
            </button>
          )}
        </div>
      </aside>
      <main style={{ padding: '2rem 3rem', background: 'var(--bg-body)' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          {location.pathname !== '/' && (
            <p className="text-muted" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 12 }}>
              {location.pathname.replace('/', '')}
            </p>
          )}
          <h1 style={{ margin: '0.2rem 0 0', fontSize: '2rem' }}>
            {location.pathname === '/'
              ? 'Streamline your job hunt'
              : location.pathname === '/results'
                ? 'Job matches'
                : location.pathname === '/workspace'
                  ? 'Tailoring studio'
                  : 'Insights dashboard'}
          </h1>
        </div>
        {user ? (
          <Outlet />
        ) : (
          <AuthGate isLoading={isFetchingProfile && !!token} onConnect={loginWithGoogle} />
        )}
      </main>
    </div>
  )
}

const AuthGate = ({ onConnect, isLoading }: { onConnect: () => void; isLoading: boolean }) => (
  <div className="glass-card" style={{ padding: '2rem', display: 'grid', gap: '1rem', placeItems: 'center' }}>
    <Shield size={36} color="var(--accent-primary)" />
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ margin: 0 }}>Secure your dashboard</h2>
      <p style={{ margin: '0.5rem 0', color: 'var(--text-muted)' }}>
        Connect your Google account to enable resume uploads, tailored generation, and pipeline analytics.
      </p>
    </div>
    <button
      className="accent-button"
      onClick={onConnect}
      disabled={isLoading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
    >
      {isLoading ? <Loader2 className="spin" size={18} /> : null}
      {isLoading ? 'Connecting…' : 'Sign in with Google'}
    </button>
  </div>
)