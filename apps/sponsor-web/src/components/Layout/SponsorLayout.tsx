import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ChangePasswordModal from '../shared/ChangePasswordModal'

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  rewards: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
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
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  signout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

const NAV = [
  { to: '/dashboard',           label: 'Overview',  icon: 'dashboard' as const },
  { to: '/dashboard/rewards',   label: 'Rewards',   icon: 'rewards'   as const },
  { to: '/dashboard/analytics', label: 'Analytics', icon: 'analytics' as const },
  { to: '/dashboard/profile',   label: 'Profile',   icon: 'profile'   as const },
]

export default function SponsorLayout() {
  const { sponsor, signOut, isFirstLogin } = useAuth()
  const initial = sponsor?.company_name?.charAt(0)?.toUpperCase() ?? 'S'
  const [showPwdModal, setShowPwdModal] = useState(false)

  // Show modal once when isFirstLogin becomes true
  useEffect(() => { if (isFirstLogin) setShowPwdModal(true) }, [isFirstLogin])

  return (
    <div className="sp-layout">
      {showPwdModal && <ChangePasswordModal onDone={() => setShowPwdModal(false)} />}
      <nav className="sp-sidebar">
        <div className="sp-sidebar-logo">
          <img src="/mycycle-logo.png" alt="MyCycle+" className="sp-sidebar-logo-img" />
          <span className="sp-sidebar-sub">Sponsor Portal</span>
        </div>

        <ul className="sp-nav-menu">
          {NAV.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/dashboard'}
                className={({ isActive }) => `sp-nav-item${isActive ? ' active' : ''}`}
              >
                <span className="sp-nav-icon">{ICONS[icon]}</span>
                <span className="sp-nav-label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sp-sidebar-profile">
          <div className="sp-profile-avatar">{initial}</div>
          <div className="sp-profile-info">
            <div className="sp-profile-name">{sponsor?.company_name || sponsor?.email}</div>
            <div className="sp-profile-email">{sponsor?.email}</div>
          </div>
          <button className="sp-profile-signout" onClick={signOut} title="Sign Out">
            {ICONS.signout}
          </button>
        </div>
      </nav>

      <main className="sp-main-content">
        <Outlet />
      </main>
    </div>
  )
}
