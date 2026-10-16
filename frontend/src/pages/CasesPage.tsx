import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type FormEvent } from 'react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DetailDrawer } from '../components/DetailDrawer'
import { PageHeader } from '../components/PageHeader'
import { SeverityBadge } from '../components/SeverityBadge'
import type { CaseItem, Severity } from '../types'

const COLUMNS = ['New', 'Triaged', 'Investigating', 'Contained', 'Resolved']

function slaLabel(caseItem: CaseItem): { text: string; tone: 'ok' | 'warn' | 'breach' } {
  if (!caseItem.sla_due) return { text: 'No SLA', tone: 'ok' }
  const due = new Date(caseItem.sla_due).getTime()
  const now = Date.now()
  const hours = (due - now) / (1000 * 60 * 60)
  if (hours < 0) return { text: 'SLA breached', tone: 'breach' }
  if (hours < 2) return { text: `SLA ${Math.max(0, hours).toFixed(1)}h`, tone: 'warn' }
  return { text: `SLA ${hours.toFixed(0)}h`, tone: 'ok' }
}

export function CasesPage() {
  const { hasRole } = useAuth()
  const canMove = hasRole('Admin', 'Analyst')
  const [cases, setCases] = useState<CaseItem[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<CaseItem | null>(null)
  const [note, setNote] = useState('')
  const [rootCause, setRootCause] = useState('')
  const [lessons, setLessons] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)

  async function load() {
    try {
      const data = await apiFetch<CaseItem[]>('/api/cases')
      setCases(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases')
    }
  }

  useEffect(() => {
    load()
  }, [])

  const grouped = useMemo(() => {
    const map: Record<string, CaseItem[]> = {}
    for (const col of COLUMNS) map[col] = []
    for (const item of cases) {
      const key = COLUMNS.includes(item.status) ? item.status : 'New'
      map[key].push(item)
    }
    return map
  }, [cases])

  async function moveCase(caseId: string, status: string) {
    await apiFetch(`/api/cases/${caseId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    await load()
    setMessage(`Moved ${caseId} → ${status}`)
  }

  function onDragStart(e: DragEvent, caseId: string) {
    if (!canMove) return
    setDraggingId(caseId)
    e.dataTransfer.setData('text/plain', caseId)
    e.dataTransfer.effectAllowed = 'move'
  }

  async function onDrop(e: DragEvent, status: string) {
    e.preventDefault()
    const caseId = e.dataTransfer.getData('text/plain') || draggingId
    setDraggingId(null)
    if (!caseId || !canMove) return
    try {
      await moveCase(caseId, status)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move failed')
    }
  }

  async function saveNote(e: FormEvent) {
    e.preventDefault()
    if (!selected || !note.trim()) return
    const updated = await apiFetch<CaseItem>(`/api/cases/${selected.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ note: note.trim() }),
    })
    setSelected(updated)
    setNote('')
    await load()
    setMessage('Note saved')
  }

  async function closeCase(e: FormEvent) {
    e.preventDefault()
    if (!selected) return
    const updated = await apiFetch<CaseItem>(`/api/cases/${selected.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        close: true,
        root_cause: rootCause,
        lessons_learned: lessons,
      }),
    })
    setSelected(updated)
    setRootCause('')
    setLessons('')
    await load()
    setMessage(`Closed ${updated.id}`)
  }

  return (
    <div>
      <PageHeader
        title="Case Board"
        subtitle="Drag cards between columns · open a case for notes and closure"
      />
      {error ? <div style={{ color: 'var(--danger)' }}>{error}</div> : null}
      {message ? (
        <div style={{ color: 'var(--accent)', marginBottom: 8, fontSize: 13 }}>{message}</div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(180px, 1fr))`,
          gap: 12,
          overflowX: 'auto',
        }}
      >
        {COLUMNS.map((col) => (
          <div
            key={col}
            onDragOver={(e) => {
              if (canMove) e.preventDefault()
            }}
            onDrop={(e) => onDrop(e, col)}
            style={{
              background: 'var(--bg-elevated)',
              border: `1px solid ${draggingId ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 14,
              padding: 12,
              minHeight: 420,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 12,
                fontWeight: 700,
              }}
            >
              <span>{col}</span>
              <span style={{ color: 'var(--text-muted)' }}>{grouped[col].length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {grouped[col].map((item) => {
                const sla = slaLabel(item)
                return (
                  <article
                    key={item.id}
                    draggable={canMove}
                    onDragStart={(e) => onDragStart(e, item.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => {
                      setSelected(item)
                      setRootCause(item.root_cause || '')
                      setLessons(item.lessons_learned || '')
                    }}
                    style={{
                      background: 'var(--bg-panel)',
                      borderRadius: 12,
                      padding: 12,
                      border: '1px solid var(--border)',
                      cursor: canMove ? 'grab' : 'pointer',
                      opacity: draggingId === item.id ? 0.6 : 1,
                    }}
                  >
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.id}</div>
                    <div style={{ fontWeight: 600, margin: '6px 0' }}>{item.title}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <SeverityBadge severity={item.severity as Severity} />
                      <span style={slaBadge(sla.tone)}>{sla.text}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        title={selected?.id || 'Case'}
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{selected.title}</div>
              <SeverityBadge severity={selected.severity} />
              <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                Status: {selected.status} · Owner: {selected.owner}
              </div>
              <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 13 }}>
                Incidents: {selected.incident_ids.join(', ') || '—'}
              </div>
            </div>

            <section>
              <h4 style={{ margin: '0 0 8px' }}>Notes</h4>
              {selected.notes.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes</div>
              ) : (
                selected.notes.map((n) => (
                  <div key={n} style={noteBox}>
                    {n}
                  </div>
                ))
              )}
              {canMove ? (
                <form onSubmit={saveNote} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add note"
                    style={input}
                  />
                  <button type="submit" style={btn}>
                    Add
                  </button>
                </form>
              ) : null}
            </section>

            <section>
              <h4 style={{ margin: '0 0 8px' }}>Closure form</h4>
              {selected.closed_at ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Closed at {new Date(selected.closed_at).toLocaleString()}
                  <div>Root cause: {selected.root_cause || '—'}</div>
                  <div>Lessons: {selected.lessons_learned || '—'}</div>
                </div>
              ) : canMove ? (
                <form onSubmit={closeCase} style={{ display: 'grid', gap: 8 }}>
                  <textarea
                    value={rootCause}
                    onChange={(e) => setRootCause(e.target.value)}
                    placeholder="Root cause"
                    rows={3}
                    style={input}
                  />
                  <textarea
                    value={lessons}
                    onChange={(e) => setLessons(e.target.value)}
                    placeholder="Lessons learned"
                    rows={3}
                    style={input}
                  />
                  <button type="submit" style={btn}>
                    Close case
                  </button>
                </form>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Read-only</div>
              )}
            </section>
          </div>
        ) : null}
      </DetailDrawer>
    </div>
  )
}

function slaBadge(tone: 'ok' | 'warn' | 'breach'): CSSProperties {
  const color = tone === 'breach' ? '#ef4444' : tone === 'warn' ? '#f97316' : '#22c55e'
  return {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 999,
    border: `1px solid ${color}55`,
    background: `${color}22`,
    color,
    fontWeight: 600,
  }
}

const input: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  color: 'var(--text)',
  font: 'inherit',
}

const btn: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--accent)',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer',
}

const noteBox: CSSProperties = {
  padding: 8,
  borderRadius: 8,
  background: 'var(--bg-panel)',
  marginBottom: 6,
  fontSize: 13,
}
