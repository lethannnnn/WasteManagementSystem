import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { User } from '../types'
import AddCollectorModal from '../components/AddCollectorModal'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

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
] as const

const TYPE_BG: Record<string, string> = {
  Donor: '#dcfce7', Collector: '#dbeafe', Sponsor: '#fef3c7', Admin: '#f3e8ff',
}
const TYPE_COLOR: Record<string, string> = {
  Donor: '#166534', Collector: '#1e40af', Sponsor: '#92400e', Admin: '#581c87',
}

function RoleStats({ user }: { user: User }) {
  if (user.type === 'Donor') {
    const pts   = user.points ?? 0
    const level = pts >= 1000 ? 'Green Champion' : pts >= 500 ? 'Eco Warrior' : 'Beginner'
    return (
      <>
        <div className="ud-stat">
          <span className="ud-stat-label">Points</span>
          <span className="ud-stat-value">{pts.toLocaleString()}</span>
        </div>
        <div className="ud-stat">
          <span className="ud-stat-label">Level</span>
          <span className="ud-stat-value ud-stat-level">{level}</span>
        </div>
      </>
    )
  }
  if (user.type === 'Collector') {
    return (
      <div className="ud-stat">
        <span className="ud-stat-label">Total Pickups</span>
        <span className="ud-stat-value">{user.collections ?? 0}</span>
      </div>
    )
  }
  if (user.type === 'Sponsor') {
    return (
      <div className="ud-stat">
        <span className="ud-stat-label">Company</span>
        <span className="ud-stat-value ud-stat-company">{user.company_name ?? '—'}</span>
      </div>
    )
  }
  return null
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { toast }   = useToast()
  const confirm     = useConfirm()

  const [activeTab, setActiveTab]       = useState<'all' | 'donor' | 'collector' | 'sponsor'>('all')
  const [searchTerm, setSearchTerm]     = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const tabCounts = {
    all:       users.length,
    donor:     users.filter(u => u.type === 'Donor').length,
    collector: users.filter(u => u.type === 'Collector').length,
    sponsor:   users.filter(u => u.type === 'Sponsor').length,
  }

  const filtered = users.filter(u => {
    const matchTab    = activeTab === 'all' || u.type.toLowerCase() === activeTab
    const matchSearch = !searchTerm ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchTab && matchSearch
  })

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
    if (selectedUser?.id === userId) {
      setSelectedUser(prev => prev ? { ...prev, status: activate ? 'Active' : 'Inactive' } : null)
    }
  }

  return (
    <div className="users-split">

      {/* ── Left: list panel ── */}
      <div className="users-list-panel">

        {/* Tab bar */}
        <div className="users-tab-bar">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`users-tab${activeTab === t.key ? ' active' : ''}`}
              onClick={() => { setActiveTab(t.key); setSelectedUser(null) }}
            >
              {t.label}
              <span className="users-tab-count">{tabCounts[t.key]}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="users-list-search">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search name or email…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* User list */}
        <div className="users-list-items">
          {isLoading ? (
            <div className="users-list-msg">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="users-list-msg">No users found</div>
          ) : (
            filtered.map(user => (
              <div
                key={user.id}
                className={`user-list-row${selectedUser?.id === user.id ? ' selected' : ''}`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="user-avatar-sm" style={{ background: TYPE_BG[user.type], color: TYPE_COLOR[user.type] }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-list-info">
                  <span className="user-list-name">{user.name}</span>
                  <span className="user-list-email">{user.email}</span>
                </div>
                <div className="user-list-meta">
                  <span className={`user-type ${user.type.toLowerCase()}`}>{user.type}</span>
                  <span className={`status-dot ${user.status.toLowerCase()}`} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="users-list-footer">
          <button className="add-collector-list-btn" onClick={() => setShowAddModal(true)}>
            + Add Collector
          </button>
        </div>

      </div>

      {/* ── Right: detail panel ── */}
      <div className="users-detail-panel">
        {!selectedUser ? (
          <div className="ud-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="52" height="52">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>Select a user to view details</p>
          </div>
        ) : (
          <div className="ud-card">

            {/* Header */}
            <div className="ud-header">
              <div className="ud-avatar" style={{ background: TYPE_BG[selectedUser.type], color: TYPE_COLOR[selectedUser.type] }}>
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="ud-identity">
                <h2 className="ud-name">{selectedUser.name}</h2>
                <div className="ud-badges">
                  <span className={`user-type ${selectedUser.type.toLowerCase()}`}>{selectedUser.type}</span>
                  <span className={`status ${selectedUser.status.toLowerCase()}`}>{selectedUser.status}</span>
                </div>
              </div>
            </div>

            {/* Fields */}
            <div className="ud-fields">
              <div className="ud-field">
                <span className="ud-label">Email</span>
                <span className="ud-value">{selectedUser.email}</span>
              </div>
              <div className="ud-field">
                <span className="ud-label">Joined</span>
                <span className="ud-value">{selectedUser.joinDate}</span>
              </div>
            </div>

            {/* Role stats */}
            <div className="ud-stats-row">
              <RoleStats user={selectedUser} />
            </div>

            {/* Actions */}
            <div className="ud-actions">
              <button
                className={selectedUser.status === 'Active' ? 'delete-btn' : 'edit-btn'}
                onClick={() => handleDeactivate(selectedUser.id, selectedUser.status)}
              >
                {selectedUser.status === 'Active' ? 'Deactivate User' : 'Reactivate User'}
              </button>
            </div>

          </div>
        )}
      </div>

      {showAddModal && (
        <AddCollectorModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast('Collector account created successfully')
          }}
        />
      )}
    </div>
  )
}
