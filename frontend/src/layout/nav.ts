import type { Role } from '../types'

export interface NavItem {
  label: string
  path: string
  roles: Role[]
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Command Center', path: '/', roles: ['Admin', 'Analyst', 'Auditor'] },
      { label: 'Alerts Explorer', path: '/alerts', roles: ['Admin', 'Analyst', 'Auditor'] },
      { label: 'Incident Workbench', path: '/incidents', roles: ['Admin', 'Analyst', 'Auditor'] },
      { label: 'Case Board', path: '/cases', roles: ['Admin', 'Analyst', 'Auditor'] },
      { label: 'Live Threat Map', path: '/map', roles: ['Admin', 'Analyst', 'Auditor'] },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Platform Health', path: '/health', roles: ['Admin', 'Analyst', 'Auditor'] },
      { label: 'Admin & RBAC', path: '/admin', roles: ['Admin'] },
      { label: 'Client Portal', path: '/portal', roles: ['Admin', 'Client'] },
    ],
  },
]
