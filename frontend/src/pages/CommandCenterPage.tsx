import { useEffect, useState, type ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiFetch } from '../api/client'
import { KpiTile } from '../components/KpiTile'
import { PageHeader } from '../components/PageHeader'
import { SeverityBadge } from '../components/SeverityBadge'
import type { LiveEvent, Severity, StatsOverview } from '../types'

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e', '#a855f7']

export function CommandCenterPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [error, setError] = useState('')
  const outlet = useOutletContext<{ liveEvents: LiveEvent[] } | null>()
  const liveEvents = outlet?.liveEvents ?? []

  useEffect(() => {
    apiFetch<StatsOverview>('/api/stats/overview')
      .then(setStats)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <div style={{ color: 'var(--danger)' }}>{error}</div>
  if (!stats) return <div style={{ color: 'var(--text-muted)' }}>Loading Command Center...</div>

  return (
    <div>
      <PageHeader
        title="Command Center"
        subtitle="Live SOC overview for Skyline — mock data until other services connect"
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KpiTile label="Alerts (24h)" value={stats.alerts_24h} />
        <KpiTile
          label="Open Critical"
          value={stats.open_incidents_by_severity.Critical || 0}
        />
        <KpiTile label="Autonomous %" value={`${stats.autonomous_percent}%`} />
        <KpiTile label="MTTD" value={`${stats.mttd_seconds}s`} />
        <KpiTile label="MTTR" value={`${stats.mttr_seconds}s`} />
        <KpiTile label="Active Blocks" value={stats.active_blocks} />
        <KpiTile label="Agent Accuracy" value={`${Math.round(stats.agent_accuracy * 100)}%`} />
        <KpiTile label="Autonomy" value={stats.autonomy_mode} hint={stats.platform_health} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Panel title="Alerts per hour">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={stats.alerts_per_hour}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip />
                <Bar dataKey="Critical" stackId="a" fill="#ef4444" />
                <Bar dataKey="High" stackId="a" fill="#f97316" />
                <Bar dataKey="Medium" stackId="a" fill="#eab308" />
                <Bar dataKey="Low" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Attack types">
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={stats.attack_type_distribution}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {stats.attack_type_distribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16,
        }}
      >
        <Panel title="Top attacking IPs">
          <List
            items={stats.top_ips.map((x) => ({
              left: x.ip,
              right: String(x.count),
            }))}
          />
        </Panel>
        <Panel title="Top endpoints">
          <List
            items={stats.top_endpoints.map((x) => ({
              left: x.endpoint,
              right: String(x.count),
            }))}
          />
        </Panel>
        <Panel title="Live feed">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflow: 'auto' }}>
            {liveEvents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Waiting for live events...
              </div>
            ) : (
              liveEvents.slice(0, 12).map((ev, idx) => (
                <div
                  key={`${ev.ts}-${idx}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-panel)',
                    fontSize: 13,
                  }}
                >
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{ev.type}</div>
                  <div>
                    {ev.data.title ||
                      ev.data.attack_type ||
                      ev.data.tool ||
                      ev.data.id}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div style={{ marginTop: 16 }}>
        <Panel title="SLA at risk">
          {stats.sla_at_risk.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No SLA breaches nearby</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.sla_at_risk.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-panel)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.id}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{item.title}</div>
                  </div>
                  <SeverityBadge severity={item.severity as Severity} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 16,
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>{title}</h3>
      {children}
    </section>
  )
}

function List({ items }: { items: Array<{ left: string; right: string }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item) => (
        <div
          key={item.left}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 13,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--bg-panel)',
          }}
        >
          <span>{item.left}</span>
          <strong>{item.right}</strong>
        </div>
      ))}
    </div>
  )
}
