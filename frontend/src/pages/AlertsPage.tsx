import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DataTable, type Column } from '../components/DataTable'
import { DetailDrawer } from '../components/DetailDrawer'
import { PageHeader } from '../components/PageHeader'
import { SeverityBadge } from '../components/SeverityBadge'
import type { Alert, Severity } from '../types'

interface AlertsResponse {
  items: Alert[]
  total: number
  page: number
  page_size: number
}

interface SavedView {
  name: string
  severity: string
  engine: string
  status: string
  attack_type: string
}

const VIEWS_KEY = 'sentinel_alert_saved_views'

function loadViews(): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]') as SavedView[]
  } catch {
    return []
  }
}

export function AlertsPage() {
  const { hasRole } = useAuth()
  const canBulk = hasRole('Admin', 'Analyst')
  const [data, setData] = useState<AlertsResponse | null>(null)
  const [page, setPage] = useState(1)
  const [severity, setSeverity] = useState('')
  const [engine, setEngine] = useState('')
  const [status, setStatus] = useState('')
  const [attackType, setAttackType] = useState('')
  const [selected, setSelected] = useState<Alert | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [views, setViews] = useState<SavedView[]>(loadViews)
  const [viewName, setViewName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: '25',
    })
    if (severity) params.set('severity', severity)
    if (engine) params.set('engine', engine)
    if (status) params.set('status', status)
    if (attackType) params.set('attack_type', attackType)

    apiFetch<AlertsResponse>(`/api/alerts?${params}`)
      .then((res) => {
        setData(res)
        setChecked(new Set())
      })
      .catch((err) => setError(err.message))
  }, [page, severity, engine, status, attackType, reloadToken])

  function persistViews(next: SavedView[]) {
    setViews(next)
    localStorage.setItem(VIEWS_KEY, JSON.stringify(next))
  }

  function saveView(e: FormEvent) {
    e.preventDefault()
    const name = viewName.trim()
    if (!name) return
    const next = [
      ...views.filter((v) => v.name !== name),
      { name, severity, engine, status, attack_type: attackType },
    ]
    persistViews(next)
    setViewName('')
    setMessage(`Saved view "${name}"`)
  }

  function applyView(view: SavedView) {
    setPage(1)
    setSeverity(view.severity)
    setEngine(view.engine)
    setStatus(view.status)
    setAttackType(view.attack_type)
    setMessage(`Applied view "${view.name}"`)
  }

  function deleteView(name: string) {
    persistViews(views.filter((v) => v.name !== name))
  }

  function toggleAll(on: boolean) {
    if (!data) return
    setChecked(on ? new Set(data.items.map((a) => a.id)) : new Set())
  }

  function toggleOne(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function runBulk(action: 'mark_false_positive' | 'merge_into_incident') {
    setError('')
    if (checked.size === 0) {
      setMessage('')
      setError('Select one or more alerts first (checkbox), then click the action.')
      return
    }
    try {
      const result = await apiFetch<{ updated: number; incident_id?: string }>(
        '/api/alerts/bulk',
        {
          method: 'POST',
          body: JSON.stringify({ ids: [...checked], action }),
        },
      )
      setMessage(
        action === 'mark_false_positive'
          ? `Marked ${result.updated} alerts as false positive — check Status column or filter "false_positive"`
          : `Merged ${result.updated} alerts into ${result.incident_id}`,
      )
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed')
    }
  }

  const columns: Column<Alert>[] = useMemo(
    () => [
      {
        key: 'select',
        header: '',
        width: '40px',
        render: (row) => (
          <input
            type="checkbox"
            checked={checked.has(row.id)}
            onChange={() => toggleOne(row.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: 'ts',
        header: 'Time',
        render: (row) => new Date(row.ts).toLocaleString(),
      },
      { key: 'engine', header: 'Engine', render: (row) => row.engine },
      { key: 'src_ip', header: 'IP', render: (row) => row.src_ip },
      { key: 'attack_type', header: 'Attack', render: (row) => row.attack_type },
      {
        key: 'severity',
        header: 'Severity',
        render: (row) => <SeverityBadge severity={row.severity as Severity} />,
      },
      {
        key: 'confidence',
        header: 'Confidence',
        render: (row) => `${Math.round(row.confidence * 100)}%`,
      },
      { key: 'status', header: 'Status', render: (row) => row.status },
    ],
    [checked],
  )

  return (
    <div>
      <PageHeader
        title="Alerts Explorer"
        subtitle="Filters, saved views, bulk actions, and alert detail drawer"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={severity}
              onChange={(e) => {
                setPage(1)
                setSeverity(e.target.value)
              }}
              style={selectStyle}
            >
              <option value="">All severities</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <select
              value={engine}
              onChange={(e) => {
                setPage(1)
                setEngine(e.target.value)
              }}
              style={selectStyle}
            >
              <option value="">All engines</option>
              <option value="ml">ml</option>
              <option value="rate">rate</option>
              <option value="rules">rules</option>
              <option value="signature">signature</option>
            </select>
            <select
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
              style={selectStyle}
            >
              <option value="">All statuses</option>
              <option value="new">new</option>
              <option value="linked">linked</option>
              <option value="closed">closed</option>
              <option value="false_positive">false_positive</option>
            </select>
            <select
              value={attackType}
              onChange={(e) => {
                setPage(1)
                setAttackType(e.target.value)
              }}
              style={selectStyle}
            >
              <option value="">All attacks</option>
              <option>BruteForce</option>
              <option>DDoS</option>
              <option>DoS</option>
              <option>WebAttack</option>
              <option>Infiltration</option>
              <option>Bot</option>
              <option>Scanning</option>
            </select>
          </div>
        }
      />

      {error ? <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</div> : null}
      {message ? <div style={{ color: 'var(--accent)', marginBottom: 8 }}>{message}</div> : null}

      <section style={panel}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Saved views</div>
        <form onSubmit={saveView} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="View name (e.g. Critical ML)"
            style={inputStyle}
          />
          <button type="submit" style={btnStyle}>
            Save current filters
          </button>
        </form>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {views.length === 0 ? (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No saved views yet</span>
          ) : (
            views.map((view) => (
              <div key={view.name} style={chip}>
                <button onClick={() => applyView(view)} style={chipBtn}>
                  {view.name}
                </button>
                <button onClick={() => deleteView(view.name)} style={chipDelete}>
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {canBulk ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={Boolean(data?.items.length && checked.size === data.items.length)}
              onChange={(e) => toggleAll(e.target.checked)}
            />{' '}
            Select page ({checked.size} selected)
          </label>
          <button
            onClick={() => runBulk('mark_false_positive')}
            style={{
              ...btnStyle,
              opacity: checked.size === 0 ? 0.55 : 1,
            }}
            title={checked.size === 0 ? 'Select alerts first' : 'Mark selected as false positive'}
          >
            Mark false positive
          </button>
          <button
            onClick={() => runBulk('merge_into_incident')}
            style={{
              ...btnStyle,
              opacity: checked.size === 0 ? 0.55 : 1,
            }}
            title={checked.size === 0 ? 'Select alerts first' : 'Merge selected into an incident'}
          >
            Merge into incident
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Tip: tick checkboxes on the left of rows first
          </span>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={data?.items || []}
        rowKey={(row) => row.id}
        onRowClick={setSelected}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 12,
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        <span>Total: {data?.total ?? 0}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={btnStyle}>
            Prev
          </button>
          <span>Page {page}</span>
          <button
            disabled={!data || page * data.page_size >= data.total}
            onClick={() => setPage((p) => p + 1)}
            style={btnStyle}
          >
            Next
          </button>
        </div>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        title={selected?.id || 'Alert'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
            <SeverityBadge severity={selected.severity} />
            <Row label="IP" value={selected.src_ip} />
            <Row label="Engine" value={selected.engine} />
            <Row label="Attack" value={selected.attack_type} />
            <Row label="Incident" value={selected.incident_id || '—'} />
            <div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Raw event</div>
              <pre style={preStyle}>{JSON.stringify(selected.raw_event, null, 2)}</pre>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
                Model probabilities
              </div>
              <pre style={preStyle}>
                {JSON.stringify(selected.model_probabilities, null, 2)}
              </pre>
            </div>
            <Row label="Top features" value={selected.top_features.join(', ')} />
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{label}</div>
      <div>{value}</div>
    </div>
  )
}

const selectStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  color: 'var(--text)',
}

const btnStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  color: 'var(--text)',
  cursor: 'pointer',
}

const inputStyle: CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  color: 'var(--text)',
}

const panel: CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
}

const chip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  border: '1px solid var(--border)',
  overflow: 'hidden',
  background: 'var(--bg-panel)',
}

const chipBtn: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--text)',
  padding: '6px 10px',
  cursor: 'pointer',
}

const chipDelete: CSSProperties = {
  border: 'none',
  borderLeft: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text-muted)',
  padding: '6px 8px',
  cursor: 'pointer',
}

const preStyle: CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 10,
  background: 'var(--bg-panel)',
  overflow: 'auto',
  fontSize: 12,
}
