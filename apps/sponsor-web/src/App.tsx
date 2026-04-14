import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import SponsorLayout from './components/Layout/SponsorLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import RewardsPage from './pages/dashboard/RewardsPage'
import AnalyticsPage from './pages/dashboard/AnalyticsPage'
import ProfilePage from './pages/dashboard/ProfilePage'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"         element={<LandingPage />} />
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <SponsorLayout />
              </ProtectedRoute>
            }>
              <Route index          element={<DashboardPage />} />
              <Route path="rewards"   element={<RewardsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="profile"   element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
