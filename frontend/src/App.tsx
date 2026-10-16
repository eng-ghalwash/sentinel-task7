import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './layout/AppShell'
import { AdminPage } from './pages/AdminPage'
import { AlertsPage } from './pages/AlertsPage'
import { CasesPage } from './pages/CasesPage'
import { CommandCenterPage } from './pages/CommandCenterPage'
import { HealthPage } from './pages/HealthPage'
import { IncidentWorkbenchPage, IncidentsPage } from './pages/IncidentsPage'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import { PortalPage } from './pages/PortalPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route
                element={<ProtectedRoute roles={['Admin', 'Analyst', 'Auditor']} />}
              >
                <Route path="/" element={<CommandCenterPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/incidents" element={<IncidentsPage />} />
                <Route path="/incidents/:id" element={<IncidentWorkbenchPage />} />
                <Route path="/cases" element={<CasesPage />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/health" element={<HealthPage />} />
              </Route>

              <Route element={<ProtectedRoute roles={['Admin']} />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>

              <Route element={<ProtectedRoute roles={['Admin', 'Client']} />}>
                <Route path="/portal" element={<PortalPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
