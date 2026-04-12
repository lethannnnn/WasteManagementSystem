import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { SidebarProvider } from './context/SidebarContext'
import { PermissionsProvider, usePermissions } from './context/PermissionsContext'
import type { Module } from './context/PermissionsContext'
import AuthScreen from './AuthScreen'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import RewardsPage from './pages/RewardsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import RoutesPage from './pages/RoutesPage'
import CollectorsPage from './pages/CollectorsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function PermissionGate({ module, children }: { module: Module; children: React.ReactNode }) {
  const { canRead, loading } = usePermissions()
  if (loading) return <LoadingScreen />
  return canRead(module) ? <>{children}</> : <Navigate to="/" replace />
}

function AppRoutes() {
  const { isAdmin } = useAuth()

  if (isAdmin === null) return <LoadingScreen />
  if (!isAdmin)         return <AuthScreen onAuthSuccess={() => {}} />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="users"
          element={<PermissionGate module="users"><UsersPage /></PermissionGate>} />
        <Route path="rewards"
          element={<PermissionGate module="rewards"><RewardsPage /></PermissionGate>} />
        <Route path="analytics"
          element={<PermissionGate module="analytics"><AnalyticsPage /></PermissionGate>} />
        <Route path="routes"
          element={<PermissionGate module="routes"><RoutesPage /></PermissionGate>} />
        <Route path="collectors"
          element={<PermissionGate module="collectors"><CollectorsPage /></PermissionGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <SidebarProvider>
            <BrowserRouter>
              <PermissionsProvider>
                <AppRoutes />
              </PermissionsProvider>
            </BrowserRouter>
          </SidebarProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
