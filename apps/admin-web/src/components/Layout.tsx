import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import { useSidebar } from '../context/SidebarContext'
import '../App.css'

const PAGE_TITLES: Record<string, string> = {
  '/':           'Dashboard Overview',
  '/users':      'User Management',
  '/rewards':    'Rewards Management',
  '/analytics':  'Analytics & Reports',
  '/routes':     'Route Optimization',
  '/collectors': 'Collector Management',
}

export default function Layout() {
  const { pathname }  = useLocation()
  const { collapsed } = useSidebar()
  const title         = PAGE_TITLES[pathname] ?? 'Admin'

  return (
    <div className={`admin-app${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar />
      <main className="main-content">
        <header className="top-header">
          <h1>{title}</h1>
          <div className="header-actions">
            <NotificationBell />
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
