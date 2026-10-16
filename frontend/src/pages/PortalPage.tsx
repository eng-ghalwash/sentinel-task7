import { useEffect, useState , type CSSProperties} from 'react'
import { apiFetch } from '../api/client'
import { PageHeader } from '../components/PageHeader'
import type { StatsOverview } from '../types'

export function PortalPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null)

  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<StatsOverview>('/api/stats/overview')
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  return (
    <div>
      <PageHeader
        title="Client Portal"
        subtitle="Plain-language posture view for Skyline (read-only)"
      />

      {error ? <div style={{ color: 'var(--danger)' }}>{error}</div> : null}
      {!stats && !error ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading portal...</div>
      ) : stats ? (
        <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Security posture</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Sentinel is actively monitoring your web application. In the last 24 hours there
              were <strong>{stats.alerts_24h}</strong> alerts. About{' '}
              <strong>{stats.autonomous_percent}%</strong> of incidents were handled
              automatically, with {stats.active_blocks} active protections in place.
            </p>
          </section>
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Open incidents</h3>
            <ul>
              {Object.entries(stats.open_incidents_by_severity).map(([sev, count]) => (
                <li key={sev}>
                  {sev}: {count}
                </li>
              ))}
            </ul>
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
