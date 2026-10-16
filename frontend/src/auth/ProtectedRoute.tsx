import { Navigate, Outlet, useOutletContext } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { Role } from '../types'

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth()
  const parentContext = useOutletContext()

  if (loading) {
    return (
      <div style={{ padding: 40, color: 'var(--text-muted)' }}>Checking session...</div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === 'Client' ? '/portal' : '/'} replace />
  }

  return <Outlet context={parentContext} />
}
