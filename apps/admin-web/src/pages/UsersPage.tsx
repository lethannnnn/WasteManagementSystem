import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { User } from '../types'
import AddUserModal from '../components/AddUserModal'
import RolePermissionsView from '../components/RolePermissionsView'
import Pagination from '../components/Pagination'
import { useSortable } from '../hooks/useSortable'
import { usePagination } from '../hooks/usePagination'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

const DEFAULT_ADMIN_EMAIL = 'admin@mycycle.com'

async function fetchUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      user_id, email, full_name, created_at, user_type, is_active,
      donors(donor_id, total_points),
      collectors(collector_id, total_collections),
      sponsors(sponsor_id, company_name)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(u => ({
    id:           u.user_id,
    name:         u.full_name ?? 'Unknown',
    email:        u.email,
    type:         (u.donors ? 'Donor' : u.collectors ? 'Collector' : u.sponsors ? 'Sponsor' : 'Admin') as User['type'],
    status:       u.is_active ? 'Active' : 'Inactive',
    points:       (u.donors as any)?.[0]?.total_points ?? 0,
    collections:  (u.collectors as any)?.[0]?.total_collections ?? 0,
    joinDate:     u.created_at?.split('T')[0] ?? '',
    company_name: (u.sponsors as any)?.[0]?.company_name,
  }))
}

const TABS = [
  { key: 'all',       label: 'All Users'  },
  { key: 'donor',     label: 'Donors'     },
  { key: 'collector', label: 'Collectors' },
  { key: 'sponsor',   label: 'Sponsors'   },
  { key: 'admin',     label: 'Admins'     },
] as const
type TabKey = typeof TABS[number]['key']
type ViewMode = 'table' | 'detail' | 'permissions'

const TYPE_BG: Record<string, string> = {
  Donor: '#dcfce7', Collector: '#dbeafe', Sponsor: '#fef3c7', Admin: '#f3e8ff',
}
const TYPE_COLOR: Record<string, string> = {
  Donor: '#166534', Collector: '#1e40af', Sponsor: '#92400e', Admin: '#581c87',
}

function RoleStats({ user }: { user: User }) {
  if (user.type === 'Donor')     return <span>{(user.points ?? 0).toLocaleString()} pts</span>
  if (user.type === 'Collector') return <span>{user.collections ?? 0} pickups</span>
  if (user.type === 'Sponsor')   return <span>{user.company_name ?? '—'}</span>
  return <span>—</span>
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { toast }   = useToast()
  const confirm     = useConfirm()

  const [activeTab, setActiveTab]       = useState<TabKey>('all')
  const [searchTerm, setSearchTerm]     = useState('')
  const [view, setView]                 = useState<ViewMode>('table')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const tabCounts = {
    all:       users.length,
    donor:     users.filter(u => u.type === 'Donor').length,
    collector: users.filter(u => u.type === 'Collector').length,
    sponsor:   users.filter(u => u.type === 'Sponsor').length,
    admin:     users.filter(u => u.type === 'Admin').length,
  }

  const filtered = users.filter(u => {
    const matchTab    = activeTab === 'all' || u.type.toLowerCase() === activeTab
    const matchSearch = !searchTerm ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchTab && matchSearch
  })

  const { sorted, toggle, SortIcon } = useSortable(filtered)
  const { page, setPage, pageSize, setPageSize, pageData, totalPages, total } = usePagination(sorted, 10)

  const handleDeactivate = async (userId: string, currentStatus: string) => {
    const activate = currentStatus !== 'Active'
    const ok = await confirm({
      title:       activate ? 'Reactivate user?' : 'Deactivate user?',
      message:     activate
        ? 'This user will be able to log in again.'
        : 'This user will no longer be able to log in. You can reactivate them later.',
      confirmText: activate ? 'Reactivate' : 'Deactivate',
      variant:     activate ? 'default' : 'danger',
    })
    if (!ok) return
    await supabase.from('users').update({ is_active: activate }).eq('user_id', userId)
    queryClient.invalidateQueries({ queryKey: ['users'] })
    toast(`User ${activate ? 'reactivated' : 'deactivated'} successfully`)
    setSelectedUser(prev => prev ? { ...prev, status: activate ? 'Active' : 'Inactive' } : null)
  }

  const openDetail = (user: User) => { setSelectedUser(user); setView('detail') }
  const backToTable = () => { setSelectedUser(null); setView('table') }
  const openPerms   = () => { setSelectedUser(null); setView('permissions') }
  const openTab     = (key: TabKey) => { setActiveTab(key); setSelectedUser(null); setView('table'); setPage(1) }

  return (
    <div className="users-split">

      {/* ── LEFT: always-visible sidebar ── */}
      <div className="users-list-panel">
        <p className="users-filter-label">Filter by Role</p>
        <div className="users-tab-bar">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`users-tab${activeTab === t.key && view !== 'permissions' ? ' active' : ''}`}
              onClick={() => openTab(t.key)}
            >
              {t.label}
              <span className="users-tab-count">{tabCounts[t.key]}</span>
            </button>
          ))}
        </div>

        <div className="users-sidebar-divider" />

        <p className="users-filter-label">Manage</p>
        <div className="users-tab-bar">
          <button
            className={`users-tab users-nav-item${view === 'permissions' ? ' active' : ''}`}
            onClick={openPerms}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Role &amp; Permissions
          </button>
        </div>
      </div>

      {/* ── RIGHT: table / detail / permissions ── */}

      {view === 'permissions' && (
        <RolePermissionsView />
      )}

      {view === 'detail' && selectedUser && (
        <div className="users-detail-panel">
          <div className="ud-card">

            <div className="ud-profile-head">
              <div className="ud-avatar" style={{ background: TYPE_BG[selectedUser.type], color: TYPE_COLOR[selectedUser.type] }}>
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="ud-identity">
                <h2 className="ud-name">{selectedUser.name}</h2>
                <p className="ud-email-text">{selectedUser.email}</p>
                <div className="ud-badges">
                  <span className={`user-type ${selectedUser.type.toLowerCase()}`}>{selectedUser.type}</span>
                  <span className={`status ${selectedUser.status.toLowerCase()}`}>{selectedUser.status}</span>
                </div>
              </div>
            </div>

            <div className="ud-info-grid">
              <div className="ud-info-item">
                <span className="ud-info-label">Member Since</span>
                <span className="ud-info-value">{selectedUser.joinDate}</span>
              </div>
              {selectedUser.type === 'Donor' && (
                <div className="ud-info-item">
                  <span className="ud-info-label">Total Points</span>
                  <span className="ud-info-value ud-info-highlight">{(selectedUser.points ?? 0).toLocaleString()}</span>
                </div>
              )}
              {selectedUser.type === 'Collector' && (
                <div className="ud-info-item">
                  <span className="ud-info-label">Collections</span>
                  <span className="ud-info-value ud-info-highlight">{selectedUser.collections ?? 0}</span>
                </div>
              )}
              {selectedUser.type === 'Sponsor' && (
                <div className="ud-info-item">
                  <span className="ud-info-label">Company</span>
                  <span className="ud-info-value">{selectedUser.company_name ?? '—'}</span>
                </div>
              )}
              {selectedUser.type === 'Admin' && (
                <div className="ud-info-item">
                  <span className="ud-info-label">Access Level</span>
                  <span className="ud-info-value">Administrator</span>
                </div>
              )}
            </div>

            <div className="ud-footer">
              <button className="ud-back-inline-btn" onClick={backToTable}>← Back to list</button>
              {selectedUser.email !== DEFAULT_ADMIN_EMAIL ? (
                <button
                  className={selectedUser.status === 'Active' ? 'ud-deactivate-btn' : 'ud-reactivate-btn'}
                  onClick={() => handleDeactivate(selectedUser.id, selectedUser.status)}
                >
                  {selectedUser.status === 'Active' ? 'Deactivate User' : 'Reactivate User'}
                </button>
              ) : (
                <span className="ud-protected-note">Default admin · cannot be deactivated</span>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'table' && (
        <div className="users-table-view">
          <div className="users-table-topbar">
            <div className="users-table-search">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Search name or email…"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
              />
            </div>
            <div className="users-table-topbar-right">
              <span className="users-table-count">
                {isLoading ? 'Loading…' : `${total} user${total !== 1 ? 's' : ''}`}
              </span>
              <button className="add-user-btn" onClick={() => setShowAddModal(true)}>+ Add User</button>
            </div>
          </div>

          <div className="users-table-scroll">
            <table className="users-table-main">
              <thead>
                <tr>
                  <th className="sortable-th" onClick={() => toggle('name')}>Name <SortIcon col="name" /></th>
                  <th>Email</th>
                  <th className="sortable-th" onClick={() => toggle('type')}>Type <SortIcon col="type" /></th>
                  <th className="sortable-th" onClick={() => toggle('status')}>Status <SortIcon col="status" /></th>
                  <th>Stats</th>
                  <th className="sortable-th" onClick={() => toggle('joinDate')}>Joined <SortIcon col="joinDate" /></th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="users-table-msg">Loading users…</td></tr>
                ) : pageData.length === 0 ? (
                  <tr><td colSpan={7} className="users-table-msg">No users found</td></tr>
                ) : pageData.map(user => (
                  <tr key={user.id} className="users-table-row">
                    <td>
                      <div className="user-row-name">
                        <div className="user-avatar-sm" style={{ background: TYPE_BG[user.type], color: TYPE_COLOR[user.type] }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td className="user-row-email">{user.email}</td>
                    <td><span className={`user-type ${user.type.toLowerCase()}`}>{user.type}</span></td>
                    <td><span className={`status ${user.status.toLowerCase()}`}>{user.status}</span></td>
                    <td className="user-row-stats"><RoleStats user={user} /></td>
                    <td className="user-row-date">{user.joinDate}</td>
                    <td>
                      <button className="view-details-btn" onClick={() => openDetail(user)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && total > 0 && (
            <Pagination page={page} totalPages={totalPages} pageSize={pageSize} total={total} onPage={setPage} onSize={setPageSize} />
          )}
        </div>
      )}

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast('User account created successfully') }}
        />
      )}
    </div>
  )
}
