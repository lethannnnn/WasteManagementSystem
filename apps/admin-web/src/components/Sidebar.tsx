import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useSidebar } from '../context/SidebarContext'
import { supabase } from '../lib/supabase'

async function fetchBadges() {
  const [pendingRoutes, pendingPickups] = await Promise.all([
    supabase.from('routes').select('route_id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('pickups').select('pickup_id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  return {
    routes:     pendingRoutes.count ?? 0,
    collectors: pendingPickups.count ?? 0,
  }
}

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  rewards: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  routes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="3"/>
      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 7.2 12.3 8 13 .8-.7 8-7.75 8-13a8 8 0 0 0-8-8z"/>
    </svg>
  ),
  collectors: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1"/>
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  collapse: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  expand: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  signout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

type IconKey = keyof typeof ICONS

const NAV_ITEMS: { to: string; label: string; icon: IconKey; badgeKey?: 'routes' | 'collectors' }[] = [
  { to: '/',           label: 'Dashboard',           icon: 'dashboard'  },
  { to: '/users',      label: 'Manage Users',         icon: 'users'      },
  { to: '/rewards',    label: 'Manage Rewards',       icon: 'rewards'    },
  { to: '/analytics',  label: 'Analytics',            icon: 'analytics'  },
  { to: '/routes',     label: 'Route Optimization',   icon: 'routes',    badgeKey: 'routes'     },
  { to: '/collectors', label: 'Collector Management', icon: 'collectors', badgeKey: 'collectors' },
]

export default function Sidebar() {
  const { signOut, adminName }    = useAuth()
  const { collapsed, toggle }     = useSidebar()

  const { data: badges } = useQuery({
    queryKey: ['nav-badges'],
    queryFn:  fetchBadges,
    staleTime: 60_000,
  })

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>

      {/* ── Logo header ── */}
      <div className="sidebar-header">
        {collapsed ? (
          <img src="/mycycle-logo.png" alt="MyCycle+" className="sidebar-logo-icon" />
        ) : (
          <img src="/mycycle-logo.png" alt="MyCycle+" className="sidebar-logo-full" />
        )}
        <button
          className="sidebar-toggle-btn"
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? ICONS.expand : ICONS.collapse}
        </button>
      </div>

      {/* ── Nav items ── */}
      <ul className="nav-menu">
        {NAV_ITEMS.map(({ to, label, icon, badgeKey }) => {
          const badgeCount = badgeKey ? (badges?.[badgeKey] ?? 0) : 0
          return (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? label : undefined}
              >
                <span className="nav-icon">{ICONS[icon]}</span>
                {!collapsed && <span className="nav-label">{label}</span>}
                {badgeCount > 0 && (
                  <span className="nav-badge">{badgeCount > 9 ? '9+' : badgeCount}</span>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>

      {/* ── User profile card ── */}
      <div className="sidebar-profile">
        {collapsed ? (
          <button className="sidebar-profile-collapsed" onClick={signOut} title="Sign Out">
            <div className="profile-avatar-sm">
              {adminName.charAt(0).toUpperCase()}
            </div>
          </button>
        ) : (
          <div className="sidebar-profile-expanded">
            <div className="profile-avatar-sm">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <span className="profile-name">{adminName || 'Admin'}</span>
              <span className="profile-role">Administrator</span>
            </div>
            <button className="profile-signout-btn" onClick={signOut} title="Sign Out">
              {ICONS.signout}
            </button>
          </div>
        )}
      </div>

    </nav>
  )
}
