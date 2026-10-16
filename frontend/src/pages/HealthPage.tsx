import { useEffect, useState , type CSSProperties} from 'react'
import { apiFetch } from '../api/client'
import { PageHeader } from '../components/PageHeader'
import type { HealthStatus } from '../types'

export function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)

  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<HealthStatus>('/api/health')
      .then(setHealth)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  return (
    <div>
      <PageHeader
        title="Platform Health"
        subtitle="Service status and external quota widgets (mock until real services connect)"
      />

      {error ? <div style={{ color: 'var(--danger)' }}>{error}</div> : null}
      {!health && !error ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      ) : health ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Services — {health.status}</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {health.services.map((svc) => (
                <div
                  key={svc.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-panel)',
                  }}
                >
                  <span>{svc.name}</span>
                  <span style={{ color: 'var(--success)' }}>
                    {svc.status} · {svc.latency_ms}ms
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Quotas</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {health.quotas.map((q) => {
                const pct = Math.round((q.used / q.limit) * 100)
                return (
                  <div key={q.name}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                        fontSize: 13,
                      }}
                    >
                      <span>{q.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {q.used}/{q.limit} per {q.unit}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: 'var(--bg-panel)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

const card: CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: 16,
}
