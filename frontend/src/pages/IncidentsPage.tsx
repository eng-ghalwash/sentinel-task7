import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { DataTable, type Column } from '../components/DataTable'
import { EntityGraph } from '../components/EntityGraph'
import { PageHeader } from '../components/PageHeader'
import { SeverityBadge } from '../components/SeverityBadge'
import type { Incident, Severity } from '../types'

interface IncidentsResponse {
  items: Incident[]
  total: number
}

export function IncidentsPage() {
  const [data, setData] = useState<IncidentsResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch<IncidentsResponse>('/api/incidents?page_size=50')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  const columns: Column<Incident>[] = [
    { key: 'id', header: 'ID', render: (row) => row.id },
    { key: 'title', header: 'Title', render: (row) => row.title },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <SeverityBadge severity={row.severity as Severity} />,
    },
    { key: 'status', header: 'Status', render: (row) => row.status },
    { key: 'src_ip', header: 'IP', render: (row) => row.src_ip },
    {
      key: 'score',
      header: 'Score',
      render: (row) => row.score.total.toFixed(1),
    },
    {
      key: 'open',
      header: '',
      render: (row) => (
        <Link to={`/incidents/${row.id}`} style={{ color: 'var(--accent)' }}>
          Open
        </Link>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Incidents"
        subtitle="Correlated attack stories — open one for the full workbench"
      />
      {error ? <div style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</div> : null}
      <DataTable columns={columns} rows={data?.items || []} rowKey={(row) => row.id} />
    </div>
  )
}

export function IncidentWorkbenchPage() {
  const { id } = useParams()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [tab, setTab] = useState('Overview')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    apiFetch<Incident>(`/api/incidents/${id}`)
      .then(setIncident)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [id])

  if (error) return <div style={{ color: 'var(--danger)' }}>{error}</div>
  if (!incident) {
    return <div style={{ color: 'var(--text-muted)' }}>Loading incident...</div>
  }

  const tabs = ['Overview', 'Timeline', 'Evidence', 'Entities', 'Reasoning', 'Actions', 'Notes']

  const timeline = [
    { ts: incident.opened_at, event: 'Incident opened' },
    ...incident.alert_ids.slice(0, 8).map((alertId, idx) => ({
      ts: incident.opened_at,
      event: `Alert linked: ${alertId}${idx === 0 ? ' (first)' : ''}`,
    })),
    {
      ts: incident.sla_due || incident.opened_at,
      event: `SLA due${incident.sla_due ? '' : ' (not set)'}`,
    },
  ]

  function addLocalNote() {
    if (!note.trim() || !incident) return
    setIncident({ ...incident, notes: [...incident.notes, note.trim()] })
    setNote('')
    setMessage('Note added locally (mock until case backend owns persistence)')
  }

  return (
    <div>
      <PageHeader
        title={incident.id}
        subtitle={incident.title}
        actions={<SeverityBadge severity={incident.severity} />}
      />
      {message ? (
        <div style={{ color: 'var(--accent)', marginBottom: 10, fontSize: 13 }}>{message}</div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Meta label="Status" value={incident.status} />
        <Meta label="Owner" value={incident.owner} />
        <Meta label="IP" value={incident.src_ip} />
        <Meta label="Score" value={String(incident.score.total)} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: tab === name ? 'var(--accent-soft)' : 'var(--bg-panel)',
              color: tab === name ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer',
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <section
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 16,
        }}
      >
        {tab === 'Overview' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div>Attack family: {incident.attack_family}</div>
            <div>Techniques: {incident.technique_ids.join(', ') || '—'}</div>
            <div>Linked alerts: {incident.alert_ids.length}</div>
            <div>
              Score breakdown: base {incident.score.base}, asset{' '}
              {incident.score.asset_criticality}, reputation {incident.score.reputation},
              recurrence {incident.score.recurrence}
            </div>
          </div>
        )}

        {tab === 'Timeline' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {timeline.map((item, idx) => (
              <div
                key={`${item.event}-${idx}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 1fr',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--bg-panel)',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {new Date(item.ts).toLocaleString()}
                </span>
                <span>{item.event}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'Evidence' && (
          <pre style={pre}>{JSON.stringify(incident.evidence, null, 2)}</pre>
        )}

        {tab === 'Entities' && (
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 0 }}>
              Entity graph: IP, incident, asset, user, URL, geo, and MITRE technique
            </p>
            <EntityGraph incident={incident} />
          </div>
        )}

        {tab === 'Reasoning' && <p style={{ lineHeight: 1.6 }}>{incident.reasoning}</p>}

        {tab === 'Actions' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ActionBtn
              label="Reverse action"
              onClick={() => setMessage('Reverse requested (mock action recorded)')}
            />
            <ActionBtn
              label="Escalate"
              onClick={() => setMessage('Incident escalated (mock)')}
            />
            <ActionBtn
              label="Close as FP"
              onClick={() => {
                setIncident({ ...incident, status: 'False Positive' })
                setMessage('Closed as false positive (mock)')
              }}
            />
          </div>
        )}

        {tab === 'Notes' && (
          <div style={{ display: 'grid', gap: 10 }}>
            {incident.notes.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No notes yet</div>
            ) : (
              incident.notes.map((n) => (
                <div key={n} style={{ padding: 10, borderRadius: 8, background: 'var(--bg-panel)' }}>
                  {n}
                </div>
              ))
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note"
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-panel)',
                  color: 'var(--text)',
                }}
              />
              <ActionBtn label="Add note" onClick={addLocalNote} />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  )
}

function ActionBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--bg-panel)',
        color: 'var(--text)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

const pre: CSSProperties = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  fontSize: 13,
}
