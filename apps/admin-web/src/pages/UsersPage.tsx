import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabase-admin'
import type { User, SponsorInquiry, SponsorStatusFilter } from '../types'
import AddUserModal from '../components/AddUserModal'
import RolePermissionsView from '../components/RolePermissionsView'
import SponsorInquiryPanel from '../components/SponsorInquiryPanel'
import SponsorUserDetail from '../components/SponsorUserDetail'
import Pagination from '../components/Pagination'
import { useSortable } from '../hooks/useSortable'
import { usePagination } from '../hooks/usePagination'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

async function fetchInquiries(): Promise<SponsorInquiry[]> {
  const { data, error } = await supabase
    .from('sponsor_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

const DEFAULT_ADMIN_EMAIL = 'admin@mycycle.com'

function mapUsers(rows: any[], hasLoginCol: boolean): User[] {
  return rows.map(u => {
    // PostgREST returns related rows as objects (not arrays) when the FK has a unique constraint
    const sponsor  = u.sponsors   as any
    const donor    = u.donors     as any
    const collector = u.collectors as any
    return {
      id:           u.user_id,
      name:         u.user_type === 'sponsor'
                      ? (sponsor?.company_name || u.full_name || '—')
                      : (u.full_name || '—'),
      email:        u.email,
      type:         ({ donor: 'Donor', collector: 'Collector', sponsor: 'Sponsor', admin: 'Admin' }[u.user_type as string] ?? 'Admin') as User['type'],
      status:       u.is_active ? 'Active' : 'Inactive',
      points:       donor?.total_points ?? 0,
      collections:  collector?.total_collections ?? 0,
      joinDate:     u.created_at?.split('T')[0] ?? '',
      company_name: sponsor?.company_name,
      hasLoggedIn:  hasLoginCol ? (u.has_logged_in ?? false) : false,
    }
  })
}

async function fetchUsers(): Promise<User[]> {
  const BASE = `
    user_id, email, full_name, created_at, user_type, is_active,
    donors(donor_id, total_points),
    collectors(collector_id, total_collections),
    sponsors(sponsor_id, company_name)
  `
  // Use admin client so sponsors join bypasses RLS
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(`${BASE}, has_logged_in`)
    .order('created_at', { ascending: false })

  if (!error) return mapUsers(data ?? [], true)

  // has_logged_in column not migrated yet — fall back gracefully
  const { data: fallback, error: e2 } = await supabaseAdmin
    .from('users').select(BASE).order('created_at', { ascending: false })
  if (e2) throw e2
  return mapUsers(fallback ?? [], false)
}

const TABS = [
  { key: 'all',       label: 'All Users'  },
  { key: 'donor',     label: 'Donors'     },
  { key: 'collector', label: 'Collectors' },
  { key: 'sponsor',   label: 'Sponsors'   },
  { key: 'admin',     label: 'Admins'     },
] as const
type TabKey = typeof TABS[number]['key']

const TYPE_BG: Record<string, string> = {
  Donor: '#dcfce7', Collector: '#dbeafe', Sponsor: '#fef3c7', Admin: '#f3e8ff',
}
const TYPE_COLOR: Record<string, string> = {
  Donor: '#166534', Collector: '#1e40af', Sponsor: '#92400e', Admin: '#581c87',
}


type ViewMode = 'table' | 'detail' | 'permissions' | 'inquiry'

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { toast }   = useToast()
  const confirm     = useConfirm()
  const [searchParams] = useSearchParams()

  const [activeTab, setActiveTab]                   = useState<TabKey>('all')
  const [searchTerm, setSearchTerm]                 = useState('')
  const [view, setView]                             = useState<ViewMode>('table')
  const [selectedUser, setSelectedUser]             = useState<User | null>(null)
  const [selectedInquiry, setSelectedInquiry]       = useState<SponsorInquiry | null>(null)
  const [showAddModal, setShowAddModal]             = useState(false)
  const [sponsorStatusFilter, setSponsorStatusFilter] = useState<SponsorStatusFilter>('all')
  const [showInactive, setShowInactive]             = useState(false)

  // Navigate to sponsor tab when notification bell links here
  useEffect(() => {
    if (searchParams.get('tab') === 'sponsor') {
      setActiveTab('sponsor')
      setView('table')
    }
  }, [searchParams])

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const { data: inquiries = [] }        = useQuery({ queryKey: ['sponsor-inquiries'], queryFn: fetchInquiries })

  const pendingInquiries  = inquiries.filter(i => i.status === 'pending')
  const rejectedInquiries = inquiries.filter(i => i.status === 'rejected')

  const sponsorUsers    = users.filter(u => u.type === 'Sponsor')
  const awaitingCount   = sponsorUsers.filter(u => !u.hasLoggedIn && u.status === 'Active').length
  const activeCount     = sponsorUsers.filter(u =>  u.hasLoggedIn && u.status === 'Active').length
  const suspendedCount  = sponsorUsers.filter(u => u.status === 'Inactive').length

  const sponsorFilterChips: { key: SponsorStatusFilter; label: string; count: number }[] = [
    { key: 'all',      label: 'All',               count: pendingInquiries.length + sponsorUsers.length + rejectedInquiries.length },
    { key: 'pending',  label: 'Pending',            count: pendingInquiries.length },
    { key: 'awaiting', label: 'Awaiting Activation', count: awaitingCount },
    { key: 'active',   label: 'Active',             count: activeCount },
    { key: 'rejected', label: 'Rejected',           count: rejectedInquiries.length },
    { key: 'suspended',label: 'Suspended',          count: suspendedCount },
  ]

  const handleSendReminder = async (user: User) => {
    await supabase.functions.invoke('send-sponsor-email', {
      body: { type: 'reminder', name: user.name, email: user.email, company: user.company_name ?? '' },
    })
    toast(`Reminder sent to ${user.email}`)
  }

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
    // Default: hide inactive users unless checkbox is ticked
    if (!showInactive && u.status === 'Inactive') return false

    let matchStatus = true
    if (activeTab === 'sponsor') {
      if (sponsorStatusFilter === 'awaiting')       matchStatus = !u.hasLoggedIn && u.status === 'Active'
      else if (sponsorStatusFilter === 'active')    matchStatus =  u.hasLoggedIn && u.status === 'Active'
      else if (sponsorStatusFilter === 'suspended') matchStatus = u.status === 'Inactive'
      else if (sponsorStatusFilter === 'pending' || sponsorStatusFilter === 'rejected') matchStatus = false
    }
    return matchTab && matchSearch && matchStatus
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

  const handleDelete = async (user: User) => {
    const ok = await confirm({
      title:       'Delete user?',
      message:     `This will permanently delete ${user.name !== '—' ? user.name : user.email} and all their data. This cannot be undone.`,
      confirmText: 'Delete',
      variant:     'danger',
    })
    if (!ok) return
    // Delete from auth (cascades to public.users via trigger, or we do both)
    await supabaseAdmin.auth.admin.deleteUser(user.id)
    await supabase.from('users').delete().eq('user_id', user.id)
    queryClient.invalidateQueries({ queryKey: ['users'] })
    toast(`${user.email} deleted`)
    backToTable()
  }

  const openDetail    = (user: User) => { setSelectedUser(user); setView('detail') }
  const openInquiry   = (inq: SponsorInquiry) => { setSelectedInquiry(inq); setView('inquiry') }
  const backToTable   = () => { setSelectedUser(null); setSelectedInquiry(null); setView('table') }
  const openPerms     = () => { setSelectedUser(null); setView('permissions') }
  const openTab       = (key: TabKey) => { setActiveTab(key); setSelectedUser(null); setSelectedInquiry(null); setView('table'); setPage(1); setSponsorStatusFilter('all') }

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
              <span className="users-tab-badges">
                <span className="users-tab-count">{tabCounts[t.key]}</span>
                {t.key === 'sponsor' && pendingInquiries.length > 0 && (
                  <span className="users-tab-pending-dot" title={`${pendingInquiries.length} pending`}>
                    {pendingInquiries.length}
                  </span>
                )}
              </span>
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

      {view === 'permissions' && <RolePermissionsView />}

      {view === 'inquiry' && selectedInquiry && (
        <SponsorInquiryPanel inquiry={selectedInquiry} onBack={backToTable} />
      )}

      {view === 'detail' && selectedUser && selectedUser.type === 'Sponsor' && (
        <SponsorUserDetail
          user={selectedUser}
          inquiry={inquiries.find(i => i.email === selectedUser.email)}
          onBack={backToTable}
          onDeactivate={() => handleDeactivate(selectedUser.id, selectedUser.status)}
          onDelete={() => handleDelete(selectedUser)}
          onRemind={() => handleSendReminder(selectedUser)}
          isDefaultAdmin={selectedUser.email === DEFAULT_ADMIN_EMAIL}
        />
      )}

      {view === 'detail' && selectedUser && selectedUser.type !== 'Sponsor' && (
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
              {selectedUser.type === 'Admin' && (
                <div className="ud-info-item">
                  <span className="ud-info-label">Access Level</span>
                  <span className="ud-info-value">Administrator</span>
                </div>
              )}
            </div>

            <div className="ud-footer">
              <button className="ud-back-inline-btn" onClick={backToTable}>← Back to list</button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedUser.email !== DEFAULT_ADMIN_EMAIL ? (
                  <>
                    <button
                      className={selectedUser.status === 'Active' ? 'ud-deactivate-btn' : 'ud-reactivate-btn'}
                      onClick={() => handleDeactivate(selectedUser.id, selectedUser.status)}
                    >
                      {selectedUser.status === 'Active' ? 'Deactivate User' : 'Reactivate User'}
                    </button>
                    <button className="ud-delete-btn" onClick={() => handleDelete(selectedUser)}>
                      Delete
                    </button>
                  </>
                ) : (
                  <span className="ud-protected-note">Default admin · cannot be deactivated</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'table' && (
        <div className="users-table-view">

          {/* Sponsor status filter chips */}
          {activeTab === 'sponsor' && (
            <div className="sponsor-status-filters">
              {sponsorFilterChips.map(chip => (
                <button
                  key={chip.key}
                  className={`ssf-chip ssf-${chip.key}${sponsorStatusFilter === chip.key ? ' active' : ''}`}
                  onClick={() => setSponsorStatusFilter(chip.key)}
                >
                  {chip.label}
                  <span className="ssf-count">{chip.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Pending applications — only in "All" filter */}
          {activeTab === 'sponsor' && sponsorStatusFilter === 'all' && pendingInquiries.length > 0 && (
            <div className="sponsor-inquiries-section siq-inset">
              <div className="sponsor-inquiries-header">
                <span>Pending Applications</span>
                <span className="sponsor-inquiries-count">{pendingInquiries.length}</span>
              </div>
              <div className="sponsor-inquiries-list">
                {pendingInquiries.map(inq => (
                  <div key={inq.id} className="sponsor-inquiry-row" onClick={() => openInquiry(inq)}>
                    <div className="siq-avatar">{inq.company_name.charAt(0).toUpperCase()}</div>
                    <div className="siq-info">
                      <span className="siq-company">{inq.company_name}</span>
                      <span className="siq-meta">{inq.email} · {inq.partnership_type || 'Partnership'}</span>
                    </div>
                    <div className="siq-right">
                      <span className="siq-date">{new Date(inq.created_at).toLocaleDateString('en-MY')}</span>
                      <span className="status pending">Pending</span>
                    </div>
                    <svg className="siq-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected applications — only when "Rejected" chip is selected */}
          {activeTab === 'sponsor' && sponsorStatusFilter === 'rejected' && (
            rejectedInquiries.length === 0 ? (
              <div className="siq-empty-state">No rejected applications</div>
            ) : (
              <div className="sponsor-inquiries-section rejected siq-inset">
                <div className="sponsor-inquiries-header">
                  <span>Rejected Applications</span>
                  <span className="sponsor-inquiries-count">{rejectedInquiries.length}</span>
                </div>
                <div className="sponsor-inquiries-list">
                  {rejectedInquiries.map(inq => (
                    <div key={inq.id} className="sponsor-inquiry-row" onClick={() => openInquiry(inq)}>
                      <div className="siq-avatar rejected">{inq.company_name.charAt(0).toUpperCase()}</div>
                      <div className="siq-info">
                        <span className="siq-company">{inq.company_name}</span>
                        <span className="siq-meta">{inq.email} · {inq.partnership_type || 'Partnership'}</span>
                      </div>
                      <div className="siq-right">
                        <span className="siq-date">{new Date(inq.created_at).toLocaleDateString('en-MY')}</span>
                        <span className="status rejected">Rejected</span>
                      </div>
                      <svg className="siq-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Hide user table when filter is inquiry-only (pending/rejected) */}
          {!(activeTab === 'sponsor' && (sponsorStatusFilter === 'pending' || sponsorStatusFilter === 'rejected')) && (<>
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
              <label className="show-inactive-label">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={e => setShowInactive(e.target.checked)}
                />
                Show inactive
              </label>
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
                    <td>
                      {user.type === 'Sponsor' ? (
                        <span className={`status ${!user.hasLoggedIn && user.status === 'Active' ? 'awaiting' : user.status.toLowerCase()}`}>
                          {!user.hasLoggedIn && user.status === 'Active' ? 'Awaiting' : user.status}
                        </span>
                      ) : (
                        <span className={`status ${user.status.toLowerCase()}`}>{user.status}</span>
                      )}
                    </td>
                    <td className="user-row-date">{user.joinDate}</td>
                    <td>
                      <div className="user-row-actions">
                        <button className="view-details-btn" onClick={() => openDetail(user)}>
                          View Details
                        </button>
                        {user.type === 'Sponsor' && !user.hasLoggedIn && user.status === 'Active' && (
                          <button className="reminder-btn" title="Send login reminder email" onClick={() => handleSendReminder(user)}>
                            Remind
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && total > 0 && (
            <Pagination page={page} totalPages={totalPages} pageSize={pageSize} total={total} onPage={setPage} onSize={setPageSize} />
          )}
          </>)}
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
