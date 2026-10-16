import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { PageHeader } from '../components/PageHeader'
import type {
  AutonomyMode,
  PlatformConfig,
  Severity,
} from '../types'

interface TotpSetup {
  secret: string
  otpauth_url: string
  qr_base64: string
}

export function AdminPage() {
  const { refreshUser, user } = useAuth()
  const [config, setConfig] = useState<PlatformConfig | null>(null)
  const [message, setMessage] = useState('')
  const [newKeyName, setNewKeyName] = useState('Integration key')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [routeForm, setRouteForm] = useState({
    name: '',
    channel: 'telegram',
    target: '',
    min_severity: 'High',
  })
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpEnabled, setTotpEnabled] = useState(Boolean(user?.totp_enabled))

  async function load() {
    const data = await apiFetch<PlatformConfig>('/api/admin/config')
    setConfig(data)
  }

  useEffect(() => {
    load().catch((err) => setMessage(err.message))
    apiFetch<{ enabled: boolean }>('/api/auth/totp/status')
      .then((s) => setTotpEnabled(s.enabled))
      .catch(() => undefined)
  }, [])

  async function setAutonomy(mode: AutonomyMode) {
    const data = await apiFetch<PlatformConfig>('/api/admin/autonomy', {
      method: 'PATCH',
      body: JSON.stringify({ autonomy_mode: mode }),
    })
    setConfig(data)
    setMessage(`Autonomy mode set to ${mode}`)
  }

  async function saveThresholds() {
    if (!config) return
    const data = await apiFetch<PlatformConfig>('/api/admin/thresholds', {
      method: 'PATCH',
      body: JSON.stringify({ thresholds: config.thresholds }),
    })
    setConfig(data)
    setMessage('Thresholds saved')
  }

  async function createKey(e: FormEvent) {
    e.preventDefault()
    const created = await apiFetch<{ key: string }>('/api/admin/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: newKeyName }),
    })
    setCreatedKey(created.key)
    setMessage('API key created — copy it now, it will not be shown again')
    await load()
  }

  async function revokeKey(id: string) {
    const data = await apiFetch<PlatformConfig>(`/api/admin/api-keys/${id}`, {
      method: 'DELETE',
    })
    setConfig(data)
    setMessage(`Revoked ${id}`)
  }

  async function addRoute(e: FormEvent) {
    e.preventDefault()
    const data = await apiFetch<PlatformConfig>('/api/admin/notification-routes', {
      method: 'POST',
      body: JSON.stringify(routeForm),
    })
    setConfig(data)
    setRouteForm({ name: '', channel: 'telegram', target: '', min_severity: 'High' })
    setMessage('Notification route added')
  }

  async function toggleRoute(id: string, enabled: boolean) {
    const data = await apiFetch<PlatformConfig>(`/api/admin/notification-routes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    })
    setConfig(data)
  }

  async function deleteRoute(id: string) {
    const data = await apiFetch<PlatformConfig>(`/api/admin/notification-routes/${id}`, {
      method: 'DELETE',
    })
    setConfig(data)
    setMessage('Notification route deleted')
  }

  async function rollback(id: string) {
    const data = await apiFetch<PlatformConfig>(
      `/api/admin/config-history/${id}/rollback`,
      { method: 'POST' },
    )
    setConfig(data)
    setMessage(`Rolled back to ${id}`)
  }

  async function startTotp() {
    const setup = await apiFetch<TotpSetup>('/api/auth/totp/setup', { method: 'POST' })
    setTotpSetup(setup)
    setMessage('Scan the QR with Google Authenticator, then enter the 6-digit code')
  }

  async function enableTotp(e: FormEvent) {
    e.preventDefault()
    await apiFetch('/api/auth/totp/enable', {
      method: 'POST',
      body: JSON.stringify({ code: totpCode }),
    })
    setTotpEnabled(true)
    setTotpSetup(null)
    setTotpCode('')
    await refreshUser()
    setMessage('TOTP enabled. Next login will ask for the authenticator code.')
  }

  async function disableTotp(e: FormEvent) {
    e.preventDefault()
    await apiFetch('/api/auth/totp/disable', {
      method: 'POST',
      body: JSON.stringify({ code: totpCode }),
    })
    setTotpEnabled(false)
    setTotpCode('')
    await refreshUser()
    setMessage('TOTP disabled')
  }

  if (!config) {
    return <div style={{ color: 'var(--text-muted)' }}>{message || 'Loading admin...'}</div>
  }

  return (
    <div>
      <PageHeader title="Admin & RBAC" subtitle="Users, security, keys, notifications, and config history" />
      {message ? (
        <div style={{ marginBottom: 12, color: 'var(--accent)', fontSize: 13 }}>{message}</div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section style={card}>
          <h3 style={{ marginTop: 0 }}>Autonomy mode</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['Autonomous', 'Shadow', 'Paused'] as AutonomyMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setAutonomy(mode)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background:
                    config.autonomy_mode === mode ? 'var(--accent-soft)' : 'var(--bg-panel)',
                  color: config.autonomy_mode === mode ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>

        <section style={card}>
          <h3 style={{ marginTop: 0 }}>Thresholds</h3>
          {Object.entries(config.thresholds).map(([key, value]) => (
            <label key={key} style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{key}</div>
              <input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={value}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    thresholds: {
                      ...config.thresholds,
                      [key]: Number(e.target.value),
                    },
                  })
                }
                style={input}
              />
            </label>
          ))}
          <button onClick={saveThresholds} style={primaryBtn}>
            Save thresholds
          </button>
        </section>
      </div>

      <section style={{ ...card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Optional TOTP (Authenticator app)</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
          Status: <strong>{totpEnabled ? 'Enabled' : 'Disabled'}</strong>. Scan QR with Google /
          Microsoft Authenticator on your phone, then confirm with a 6-digit code.
        </p>
        {!totpEnabled && !totpSetup ? (
          <button onClick={startTotp} style={primaryBtn}>
            Enable TOTP
          </button>
        ) : null}
        {totpSetup ? (
          <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
            <img
              src={`data:image/png;base64,${totpSetup.qr_base64}`}
              alt="TOTP QR"
              style={{ width: 180, height: 180, background: 'white', borderRadius: 8 }}
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Manual secret: <code>{totpSetup.secret}</code>
            </div>
            <form onSubmit={enableTotp} style={{ display: 'flex', gap: 8 }}>
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6-digit code"
                style={input}
              />
              <button type="submit" style={primaryBtn}>
                Confirm
              </button>
            </form>
          </div>
        ) : null}
        {totpEnabled ? (
          <form onSubmit={disableTotp} style={{ display: 'flex', gap: 8, maxWidth: 360, marginTop: 8 }}>
            <input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="Code to disable"
              style={input}
            />
            <button type="submit" style={dangerBtn}>
              Disable TOTP
            </button>
          </form>
        ) : null}
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>API keys</h3>
        <form onSubmit={createKey} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            style={input}
            placeholder="Key name"
          />
          <button type="submit" style={primaryBtn}>
            Create key
          </button>
        </form>
        {createdKey ? (
          <div
            style={{
              marginBottom: 12,
              padding: 12,
              borderRadius: 10,
              background: 'var(--bg-panel)',
              fontSize: 13,
              wordBreak: 'break-all',
            }}
          >
            New key (copy now): <code>{createdKey}</code>
          </div>
        ) : null}
        <div style={{ display: 'grid', gap: 8 }}>
          {config.api_keys.map((key) => (
            <div key={key.id} style={row}>
              <div>
                <strong>{key.name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {key.prefix}… · {key.revoked ? 'revoked' : 'active'}
                </div>
              </div>
              {!key.revoked ? (
                <button onClick={() => revokeKey(key.id)} style={dangerBtn}>
                  Revoke
                </button>
              ) : null}
            </div>
          ))}
          {config.api_keys.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No API keys yet</div>
          ) : null}
        </div>
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Notification routes</h3>
        <form
          onSubmit={addRoute}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}
        >
          <input
            placeholder="Name"
            value={routeForm.name}
            onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
            style={input}
            required
          />
          <select
            value={routeForm.channel}
            onChange={(e) => setRouteForm({ ...routeForm, channel: e.target.value })}
            style={input}
          >
            <option value="telegram">telegram</option>
            <option value="email">email</option>
            <option value="webhook">webhook</option>
          </select>
          <input
            placeholder="Target"
            value={routeForm.target}
            onChange={(e) => setRouteForm({ ...routeForm, target: e.target.value })}
            style={input}
            required
          />
          <select
            value={routeForm.min_severity}
            onChange={(e) => setRouteForm({ ...routeForm, min_severity: e.target.value })}
            style={input}
          >
            {(['Critical', 'High', 'Medium', 'Low'] as Severity[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" style={primaryBtn}>
            Add
          </button>
        </form>
        <div style={{ display: 'grid', gap: 8 }}>
          {config.notification_routes.map((route) => (
            <div key={route.id} style={row}>
              <div>
                <strong>{route.name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {route.channel} → {route.target} · min {route.min_severity}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => toggleRoute(route.id, !route.enabled)}
                  style={secondaryBtn}
                >
                  {route.enabled ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => deleteRoute(route.id)} style={dangerBtn}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Users</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {config.users.map((u) => (
            <div key={u.id} style={row}>
              <div>
                <strong>{u.full_name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {u.username}
                  {u.totp_enabled ? ' · TOTP on' : ''}
                </div>
              </div>
              <div style={{ color: 'var(--accent)', fontWeight: 600 }}>{u.role}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...card, marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Configuration history</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {config.config_history.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Changes will appear here so you can roll back
            </div>
          ) : (
            config.config_history.map((item) => (
              <div key={item.id} style={row}>
                <div>
                  <strong>{item.action}</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {item.actor} · {new Date(item.ts).toLocaleString()}
                  </div>
                </div>
                <button onClick={() => rollback(item.id)} style={secondaryBtn}>
                  Rollback
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

const card: CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 16,
}

const input: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  color: 'var(--text)',
}

const primaryBtn: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--accent)',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const secondaryBtn: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  color: 'var(--text)',
  cursor: 'pointer',
}

const dangerBtn: CSSProperties = {
  ...secondaryBtn,
  color: 'var(--danger)',
}

const row: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '10px 12px',
  borderRadius: 10,
  background: 'var(--bg-panel)',
}
