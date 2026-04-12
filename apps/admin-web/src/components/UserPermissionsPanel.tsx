import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '../types'
import { useToast } from '../context/ToastContext'

interface Props {
  user: User
  onSaved?: () => void
}

// ── Admin permissions ──────────────────────────────────────
const PERM_KEYS: { key: string; label: string }[] = [
  { key: 'canManageUsers',      label: 'Manage Users'      },
  { key: 'canManageCollectors', label: 'Manage Collectors' },
  { key: 'canManageRoutes',     label: 'Manage Routes'     },
  { key: 'canManageRewards',    label: 'Manage Rewards'    },
  { key: 'canViewAnalytics',    label: 'View Analytics'    },
]

const ROLE_TYPES = ['super_admin', 'manager', 'viewer']

// ── Donor panel ────────────────────────────────────────────
function DonorPanel({ userId }: { userId: string }) {
  const [info, setInfo] = useState<any>(null)

  useEffect(() => {
    supabase.from('donors')
      .select('level_status, total_points, pickups_completed, total_recycled_weight')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => setInfo(data))
  }, [userId])

  if (!info) return <div className="perm-loading">Loading…</div>

  return (
    <div className="perm-section">
      <span className="perm-section-title">Account Stats</span>
      <div className="perm-stats-grid">
        <div className="perm-stat"><span className="perm-stat-label">Level</span><span className="perm-stat-value">{info.level_status}</span></div>
        <div className="perm-stat"><span className="perm-stat-label">Points</span><span className="perm-stat-value">{(info.total_points ?? 0).toLocaleString()}</span></div>
        <div className="perm-stat"><span className="perm-stat-label">Pickups</span><span className="perm-stat-value">{info.pickups_completed ?? 0}</span></div>
        <div className="perm-stat"><span className="perm-stat-label">Recycled</span><span className="perm-stat-value">{(info.total_recycled_weight ?? 0).toFixed(1)} kg</span></div>
      </div>
    </div>
  )
}

// ── Collector panel ────────────────────────────────────────
function CollectorPanel({ userId }: { userId: string }) {
  const { toast } = useToast()
  const [collectorId, setCollectorId] = useState('')
  const [status, setStatus]           = useState('')
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    supabase.from('collectors')
      .select('collector_id, employment_status')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) { setCollectorId(data.collector_id); setStatus(data.employment_status ?? '') }
      })
  }, [userId])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('collectors')
      .update({ employment_status: status })
      .eq('collector_id', collectorId)
    setSaving(false)
    if (error) toast(error.message, 'error')
    else toast('Collector settings saved')
  }

  return (
    <div className="perm-section">
      <span className="perm-section-title">Collector Settings</span>
      <div className="perm-field">
        <label className="perm-label">Employment Status</label>
        <select className="perm-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">— Not set —</option>
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="contract">Contract</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <button className="perm-save-btn" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Sponsor panel ──────────────────────────────────────────
function SponsorPanel({ userId }: { userId: string }) {
  const { toast } = useToast()
  const [sponsorId, setSponsorId]         = useState('')
  const [partnerStatus, setPartnerStatus] = useState('')
  const [partnerType, setPartnerType]     = useState('')
  const [saving, setSaving]               = useState(false)

  useEffect(() => {
    supabase.from('sponsors')
      .select('sponsor_id, partnership_status, partnership_type')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSponsorId(data.sponsor_id)
          setPartnerStatus(data.partnership_status ?? '')
          setPartnerType(data.partnership_type ?? '')
        }
      })
  }, [userId])

  const save = async () => {
    setSaving(true)
    const { error } = await supabase.from('sponsors')
      .update({ partnership_status: partnerStatus, partnership_type: partnerType })
      .eq('sponsor_id', sponsorId)
    setSaving(false)
    if (error) toast(error.message, 'error')
    else toast('Sponsor settings saved')
  }

  return (
    <div className="perm-section">
      <span className="perm-section-title">Partnership Settings</span>
      <div className="perm-field">
        <label className="perm-label">Status</label>
        <select className="perm-select" value={partnerStatus} onChange={e => setPartnerStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      <div className="perm-field">
        <label className="perm-label">Partnership Type</label>
        <select className="perm-select" value={partnerType} onChange={e => setPartnerType(e.target.value)}>
          <option value="">— Not set —</option>
          <option value="Bronze">Bronze</option>
          <option value="Silver">Silver</option>
          <option value="Gold">Gold</option>
          <option value="Platinum">Platinum</option>
        </select>
      </div>
      <button className="perm-save-btn" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Admin panel ────────────────────────────────────────────
function AdminPanel({ userId }: { userId: string }) {
  const { toast } = useToast()
  const [adminId, setAdminId]   = useState('')
  const [roleType, setRoleType] = useState('manager')
  const [perms, setPerms]       = useState<Record<string, boolean>>({})
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    supabase.from('admins')
      .select('admin_id, role_type, permissions')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setAdminId(data.admin_id)
          setRoleType(data.role_type ?? 'manager')
          const p = data.permissions ?? {}
          // Default all true for super_admin, otherwise use stored values
          const defaults = Object.fromEntries(PERM_KEYS.map(k => [k.key, data.role_type === 'super_admin']))
          setPerms({ ...defaults, ...p })
        }
      })
  }, [userId])

  const toggle = (key: string) => setPerms(prev => ({ ...prev, [key]: !prev[key] }))

  const save = async () => {
    setSaving(true)
    const finalPerms = roleType === 'super_admin'
      ? Object.fromEntries(PERM_KEYS.map(k => [k.key, true]))
      : perms
    const { error } = await supabase.from('admins')
      .update({ role_type: roleType, permissions: finalPerms })
      .eq('admin_id', adminId)
    setSaving(false)
    if (error) toast(error.message, 'error')
    else toast('Admin permissions saved')
  }

  return (
    <div className="perm-section">
      <span className="perm-section-title">Role & Permissions</span>
      <div className="perm-field">
        <label className="perm-label">Role Type</label>
        <select className="perm-select" value={roleType} onChange={e => setRoleType(e.target.value)}>
          {ROLE_TYPES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div className="perm-checkboxes">
        {PERM_KEYS.map(({ key, label }) => (
          <label key={key} className={`perm-check${roleType === 'super_admin' ? ' locked' : ''}`}>
            <input
              type="checkbox"
              checked={roleType === 'super_admin' ? true : (perms[key] ?? false)}
              onChange={() => toggle(key)}
              disabled={roleType === 'super_admin'}
            />
            {label}
          </label>
        ))}
      </div>
      {roleType === 'super_admin' && (
        <p className="perm-note">Super admins have all permissions automatically.</p>
      )}
      <button className="perm-save-btn" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────
export default function UserPermissionsPanel({ user }: Props) {
  return (
    <div className="perm-panel">
      <div className="perm-divider" />
      {user.type === 'Admin'     && <AdminPanel     userId={user.id} />}
      {user.type === 'Collector' && <CollectorPanel userId={user.id} />}
      {user.type === 'Donor'     && <DonorPanel     userId={user.id} />}
      {user.type === 'Sponsor'   && <SponsorPanel   userId={user.id} />}
    </div>
  )
}
