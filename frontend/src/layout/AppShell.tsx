import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Search, Sun, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useSSE } from '../hooks/useSSE'
import { apiFetch } from '../api/client'
import type { SearchResult } from '../types'
import { NAV_GROUPS } from './nav'

export function AppShell() {
  const { user, logout, hasRole } = useAuth()
  const { connected, events } = useSSE(Boolean(user) && user?.role !== 'Client')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      apiFetch<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  if (!user) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
      <aside
        style={{
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          padding: '18px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Sentinel
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
            Autonomous SOC Dashboard
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => hasRole(...item.roles))
            if (items.length === 0) return null
            return (
              <div key={group.title}>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                    paddingInline: 10,
                  }}
                >
                  {group.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      style={({ isActive }) => ({
                        padding: '9px 12px',
                        borderRadius: 10,
                        background: isActive ? 'var(--accent-soft)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text)',
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 500,
                      })}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: 64,
            borderBottom: '1px solid var(--border)',
            background: 'rgba(18, 26, 43, 0.72)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search IP, incident, case..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-panel)',
                color: 'var(--text)',
              }}
            />
            {results.length > 0 ? (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  zIndex: 30,
                }}
              >
                {results.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => {
                      setQuery('')
                      setResults([])
                      navigate(r.href)
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.type}</div>
                    <div style={{ fontSize: 14 }}>{r.title}</div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid var(--border)',
              fontSize: 12,
              color: connected ? 'var(--success)' : 'var(--text-muted)',
            }}
          >
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'Live' : 'Offline'}
          </div>

          <div
            style={{
              padding: '6px 10px',
              borderRadius: 999,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {user.role}
          </div>

          <button
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            style={iconBtn}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button onClick={logout} style={iconBtn} title="Logout">
            <LogOut size={16} />
          </button>
        </header>

        <main style={{ padding: 24 }}>
          <Outlet context={{ liveEvents: events, connected }} />
        </main>
      </div>
    </div>
  )
}

const iconBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  color: 'var(--text)',
  cursor: 'pointer',
}
