import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CircleMarker, LayerGroup, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { apiFetch } from '../api/client'
import { PageHeader } from '../components/PageHeader'
import { SeverityBadge } from '../components/SeverityBadge'
import type { Incident, Severity } from '../types'

interface IncidentsResponse {
  items: Incident[]
}

const SKYLINE: [number, number] = [30.0444, 31.2357] // Cairo lab target

const SEVERITY_COLOR: Record<Severity, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#3b82f6',
}

export function MapPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [error, setError] = useState('')
  const [severity, setSeverity] = useState('')
  const [attackType, setAttackType] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<IncidentsResponse>('/api/incidents?page_size=40')
      .then((res) => setIncidents(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [])

  const attackTypes = useMemo(
    () => Array.from(new Set(incidents.map((i) => i.attack_family))).sort(),
    [incidents],
  )

  const filtered = useMemo(() => {
    return incidents.filter((item) => {
      if (severity && item.severity !== severity) return false
      if (attackType && item.attack_family !== attackType) return false
      return Boolean(item.evidence?.geo)
    })
  }, [incidents, severity, attackType])

  const selected = filtered.find((i) => i.id === selectedId) || filtered[0] || null

  return (
    <div>
      <PageHeader
        title="Live Threat Map"
        subtitle="World map with attack arcs to Skyline — mock geo until Ariam connect"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={selectStyle}
            >
              <option value="">All severities</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <select
              value={attackType}
              onChange={(e) => setAttackType(e.target.value)}
              style={selectStyle}
            >
              <option value="">All attack types</option>
              {attackTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        }
      />
      {error ? <div style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</div> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
          minHeight: 560,
        }}
      >
        <div
          style={{
            borderRadius: 16,
            border: '1px solid var(--border)',
            overflow: 'hidden',
            minHeight: 560,
          }}
        >
          <MapContainer
            center={SKYLINE}
            zoom={2}
            style={{ height: 560, width: '100%', background: '#0b1220' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <CircleMarker
              center={SKYLINE}
              radius={9}
              pathOptions={{ color: '#3d8bfd', fillColor: '#3d8bfd', fillOpacity: 0.9 }}
            >
              <Popup>Skyline (customer)</Popup>
            </CircleMarker>

            {filtered.map((incident) => {
              const geo = incident.evidence.geo as {
                lat: number
                lon: number
                country?: string
              }
              const from: [number, number] = [geo.lat, geo.lon]
              const color = SEVERITY_COLOR[incident.severity]
              const mid: [number, number] = [
                (from[0] + SKYLINE[0]) / 2 + 8,
                (from[1] + SKYLINE[1]) / 2,
              ]
              return (
                <LayerGroup key={incident.id}>
                  <Polyline
                    positions={[from, mid, SKYLINE]}
                    pathOptions={{
                      color,
                      weight: selected?.id === incident.id ? 3 : 1.5,
                      opacity: selected?.id === incident.id ? 0.95 : 0.55,
                    }}
                    eventHandlers={{
                      click: () => setSelectedId(incident.id),
                    }}
                  />
                  <CircleMarker
                    center={from}
                    radius={6}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
                    eventHandlers={{
                      click: () => setSelectedId(incident.id),
                    }}
                  >
                    <Popup>
                      {incident.id}
                      <br />
                      {incident.title}
                    </Popup>
                  </CircleMarker>
                </LayerGroup>
              )
            })}
          </MapContainer>
        </div>

        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 14,
            overflow: 'auto',
            maxHeight: 560,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Incidents ({filtered.length})
          </h3>
          {selected ? (
            <div
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 12,
                background: 'var(--accent-soft)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Selected</div>
              <div style={{ fontWeight: 700, margin: '4px 0 8px' }}>{selected.title}</div>
              <SeverityBadge severity={selected.severity} />
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                IP {selected.src_ip} · {(selected.evidence.geo as { country?: string })?.country}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.slice(0, 20).map((incident) => (
              <button
                key={incident.id}
                onClick={() => setSelectedId(incident.id)}
                style={{
                  textAlign: 'left',
                  padding: 12,
                  borderRadius: 12,
                  background:
                    selected?.id === incident.id ? 'var(--accent-soft)' : 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{incident.id}</div>
                <div style={{ fontWeight: 600, margin: '4px 0 8px' }}>{incident.title}</div>
                <SeverityBadge severity={incident.severity as Severity} />
              </button>
            ))}
          </div>
        </div>
      </div>
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
