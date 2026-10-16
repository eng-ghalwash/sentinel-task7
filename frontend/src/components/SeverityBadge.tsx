import type { Severity } from '../types'

const COLORS: Record<Severity, string> = {
  Critical: 'var(--critical)',
  High: 'var(--high)',
  Medium: 'var(--medium)',
  Low: 'var(--low)',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: `${COLORS[severity]}22`,
        color: COLORS[severity],
        border: `1px solid ${COLORS[severity]}55`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: COLORS[severity],
        }}
      />
      {severity}
    </span>
  )
}
