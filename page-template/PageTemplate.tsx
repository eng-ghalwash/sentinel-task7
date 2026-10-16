/**
 * Page template for other team members.
 * Copy this file into frontend/src/pages and register the route in App.tsx.
 * Also add a nav item in frontend/src/layout/nav.ts
 */
import { PageHeader } from '../src/components/PageHeader'

export function PageTemplate() {
  return (
    <div>
      <PageHeader
        title="Your Page Title"
        subtitle="One sentence describing what this page does"
      />

      <section
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 16,
        }}
      >
        {/* Put your content here. Use shared components:
            - SeverityBadge
            - DataTable
            - DetailDrawer
            - KpiTile
            Fetch data with apiFetch from ../api/client
        */}
        <p style={{ color: 'var(--text-muted)' }}>Replace this with your feature UI.</p>
      </section>
    </div>
  )
}
