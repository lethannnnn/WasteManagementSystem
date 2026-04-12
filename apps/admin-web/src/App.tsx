import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { SidebarProvider } from './context/SidebarContext'
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

function AppRoutes() {
  const { isAdmin } = useAuth()

  if (isAdmin === null) return <LoadingScreen />
  if (!isAdmin)         return <AuthScreen onAuthSuccess={() => {}} />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index              element={<DashboardPage />}  />
        <Route path="users"      element={<UsersPage />}       />
        <Route path="rewards"    element={<RewardsPage />}     />
        <Route path="analytics"  element={<AnalyticsPage />}   />
        <Route path="routes"     element={<RoutesPage />}      />
        <Route path="collectors" element={<CollectorsPage />}  />
        <Route path="*"          element={<Navigate to="/" replace />} />
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
              <AppRoutes />
            </BrowserRouter>
          </SidebarProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
