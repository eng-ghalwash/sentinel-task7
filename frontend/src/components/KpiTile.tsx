interface KpiTileProps {
  label: string
  value: string | number
  hint?: string
}

export function KpiTile({ label, value, hint }: KpiTileProps) {
  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '16px 18px',
        minHeight: 96,
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {hint ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>
          {hint}
        </div>
      ) : null}
    </div>
  )
}
