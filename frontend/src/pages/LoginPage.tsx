import { useState, type CSSProperties, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { user, login, loading } = useAuth()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('sentinel123')
  const [totpCode, setTotpCode] = useState('')
  const [needsTotp, setNeedsTotp] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to={user.role === 'Client' ? '/portal' : '/'} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await login(username, password, needsTotp ? totpCode : undefined)
      if (result.requires_totp) {
        setNeedsTotp(true)
        setError('')
      }
    } catch {
      setError(
        needsTotp
          ? 'Invalid authenticator code. Check Google Authenticator and try again.'
          : 'Login failed. Use demo users with password sentinel123.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 'min(420px, 100%)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>Sentinel</div>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            login
          </p>
        </div>

        <label style={labelStyle}>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            autoComplete="username"
            disabled={needsTotp}
          />
        </label>

        <label style={labelStyle}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            autoComplete="current-password"
            disabled={needsTotp}
          />
        </label>

        {needsTotp ? (
          <label style={labelStyle}>
            Authenticator code
            <input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              style={inputStyle}
              placeholder="6-digit code from your phone"
              inputMode="numeric"
              autoFocus
            />
          </label>
        ) : null}

        {error ? (
          <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 6,
            padding: '12px 14px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--accent)',
            color: 'white',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {submitting ? 'Signing in...' : needsTotp ? 'Verify code' : 'Sign in'}
        </button>

        {needsTotp ? (
          <button
            type="button"
            onClick={() => {
              setNeedsTotp(false)
              setTotpCode('')
              setError('')
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Back
          </button>
        ) : null}

        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Demo users: <code>admin</code>, <code>analyst</code>, <code>auditor</code>,{' '}
          <code>client</code>
          <br />
          Password: <code>sentinel123</code>
          <br />
          TOTP optional — enable from Admin after login
        </div>
      </form>
    </div>
  )
}

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  color: 'var(--text-muted)',
}

const inputStyle: CSSProperties = {
  padding: '11px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  color: 'var(--text)',
}
