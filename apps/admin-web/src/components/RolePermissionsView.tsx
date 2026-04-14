import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabase-admin'
import { useToast } from '../context/ToastContext'
import { MODULES } from '../context/PermissionsContext'
import type { Module, Action, ModulePerms } from '../context/PermissionsContext'

// ─── Shared types ─────────────────────────────────────────────────────────────
type StoredPerms = Partial<Record<Module, ModulePerms>>

const ACTION_LABELS: Record<Action, string> = {
  read: 'R', write: 'W', modify: 'E', delete: 'D',
}

const ACTION_FULL: Record<Action, string> = {
  read: 'Read', write: 'Write', modify: 'Edit', delete: 'Delete',
}

// ─── Admin permissions ────────────────────────────────────────────────────────
interface AdminRow {
  admin_id:    string
  permissions: StoredPerms
  name:        string
  email:       string
  is_super:    boolean
}

// ─── User role permissions ────────────────────────────────────────────────────
interface RoleRow {
  role_type:   'donor' | 'sponsor' | 'collector'
  permissions: StoredPerms
  label:       string
  color:       string
  bg:          string
  desc:        string
}

const ROLE_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  donor:     { label: 'Donor',     color: '#166534', bg: '#dcfce7', desc: 'Household users who schedule pickups and earn rewards.' },
  sponsor:   { label: 'Sponsor',   color: '#92400e', bg: '#fef3c7', desc: 'Partner brands that fund rewards and run campaigns.' },
  collector: { label: 'Collector', color: '#1e40af', bg: '#dbeafe', desc: 'Field staff who complete pickups and scan QR codes.' },
}

const DEFAULT_ROLE_PERMS: Record<string, StoredPerms> = {
  donor:     { users: { read: true }, rewards: { read: true, write: true }, routes: {}, collectors: {}, analytics: {}, pickups: { read: true, write: true, modify: true } },
  sponsor:   { users: { read: true }, rewards: { read: true, write: true, modify: true, delete: true }, routes: {}, collectors: {}, analytics: { read: true }, pickups: {} },
  collector: { users: { read: true }, rewards: { read: true }, routes: { read: true }, collectors: { read: true, modify: true }, analytics: {}, pickups: { read: true, write: true, modify: true } },
}

export default function RolePermissionsView() {
  const { toast } = useToast()

  // Admin permissions state
  const [adminRows, setAdminRows]   = useState<AdminRow[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [savingAdmin, setSavingAdmin]   = useState<string | null>(null)

  // User role permissions state
  const [roleRows, setRoleRows]     = useState<RoleRow[]>([])
  const [roleLoading, setRoleLoading]   = useState(true)
  const [savingRole, setSavingRole]     = useState<string | null>(null)
  const [roleTableMissing, setRoleTableMissing] = useState(false)

  useEffect(() => { loadAdmins(); loadRoles() }, [])

  // ── Admins ──────────────────────────────────────────────────────────────────
  const loadAdmins = async () => {
    setAdminLoading(true)
    const { data } = await supabase
      .from('admins')
      .select('admin_id, role_type, permissions, users(full_name, email)')
    setAdminRows((data ?? []).map((a: any) => ({
      admin_id:    a.admin_id,
      permissions: a.permissions ?? {},
      name:        a.users?.full_name ?? 'Unknown',
      email:       a.users?.email ?? '',
      is_super:    a.role_type === 'super_admin',
    })))
    setAdminLoading(false)
  }

  const toggleAdmin = async (adminId: string, module: Module, action: Action, val: boolean, isSuperAdmin: boolean) => {
    if (isSuperAdmin) return
    setSavingAdmin(adminId)
    setAdminRows(prev => prev.map(r => {
      if (r.admin_id !== adminId) return r
      return { ...r, permissions: { ...r.permissions, [module]: { ...r.permissions[module], [action]: val } } }
    }))
    const row = adminRows.find(r => r.admin_id === adminId)!
    const updated = { ...row.permissions, [module]: { ...row.permissions[module], [action]: val } }
    const { error } = await supabase.from('admins').update({ permissions: updated }).eq('admin_id', adminId)
    if (error) { toast(error.message, 'error'); loadAdmins() }
    setSavingAdmin(null)
  }

  const getAdminVal = (row: AdminRow, module: Module, action: Action) =>
    row.is_super ? true : (row.permissions[module]?.[action] ?? false)

  // ── User roles ──────────────────────────────────────────────────────────────
  const loadRoles = async () => {
    setRoleLoading(true)
    const { data, error } = await supabaseAdmin
      .from('role_permissions')
      .select('role_type, permissions')

    if (error) {
      // Table doesn't exist yet — use defaults (read-only)
      setRoleTableMissing(true)
      setRoleRows(
        (['donor', 'sponsor', 'collector'] as const).map(rt => ({
          role_type:   rt,
          permissions: DEFAULT_ROLE_PERMS[rt],
          ...ROLE_META[rt],
        }))
      )
    } else {
      setRoleTableMissing(false)
      // Merge DB rows with meta, fill missing roles from defaults
      const byType = Object.fromEntries((data ?? []).map((r: any) => [r.role_type, r.permissions]))
      setRoleRows(
        (['donor', 'sponsor', 'collector'] as const).map(rt => ({
          role_type:   rt,
          permissions: byType[rt] ?? DEFAULT_ROLE_PERMS[rt],
          ...ROLE_META[rt],
        }))
      )
    }
    setRoleLoading(false)
  }

  const toggleRole = async (roleType: string, module: Module, action: Action, val: boolean) => {
    if (roleTableMissing) return
    setSavingRole(roleType)
    setRoleRows(prev => prev.map(r => {
      if (r.role_type !== roleType) return r
      return { ...r, permissions: { ...r.permissions, [module]: { ...r.permissions[module], [action]: val } } }
    }))
    const row = roleRows.find(r => r.role_type === roleType)!
    const updated = { ...row.permissions, [module]: { ...row.permissions[module], [action]: val } }
    const { error } = await supabaseAdmin
      .from('role_permissions')
      .upsert({ role_type: roleType, permissions: updated })
    if (error) { toast(error.message, 'error'); loadRoles() }
    setSavingRole(null)
  }

  const getRoleVal = (row: RoleRow, module: Module, action: Action) =>
    row.permissions[module]?.[action] ?? false

  // ── Shared table header ─────────────────────────────────────────────────────
  const TableHeader = ({ labelCol }: { labelCol: string }) => (
    <thead>
      <tr>
        <th className="perms-th-user perms-sticky" rowSpan={2}>{labelCol}</th>
        {MODULES.map(m => (
          <th key={m.key} className="perms-th-module" colSpan={m.actions.length}>{m.label}</th>
        ))}
      </tr>
      <tr>
        {MODULES.flatMap(m => m.actions.map(a => (
          <th key={`${m.key}-${a}`} className="perms-th-action" title={ACTION_FULL[a]}>{ACTION_LABELS[a]}</th>
        )))}
      </tr>
    </thead>
  )

  return (
    <div className="perms-view">
      <div className="perms-view-header">
        <h2 className="perms-view-title">Role &amp; Permissions</h2>
        <p className="perms-view-sub">
          Configure module access for each user role and admin account.
        </p>
      </div>

      {/* ── User Role Permissions ── */}
      <div className="perms-section-label">User Permissions</div>

      {roleTableMissing && (
        <div className="perms-migration-notice">
          Table <code>role_permissions</code> not found — showing defaults (read-only).
          Run <strong>supabase/migrations/20260414_role_permissions.sql</strong> in the Supabase dashboard to enable editing.
        </div>
      )}

      {roleLoading ? (
        <div className="perms-state">Loading…</div>
      ) : (
        <div className="perms-table-wrap">
          <table className="perms-table">
            <TableHeader labelCol="Role" />
            <tbody>
              {roleRows.map(row => (
                <tr key={row.role_type} className={`perms-row${savingRole === row.role_type ? ' saving' : ''}`}>
                  <td className="perms-sticky">
                    <div className="perms-user-cell">
                      <div className="perms-avatar" style={{ background: row.bg, color: row.color }}>
                        {row.label.charAt(0)}
                      </div>
                      <div>
                        <div className="perms-name">
                          <span className="perms-role-inline-badge" style={{ background: row.bg, color: row.color }}>
                            {row.label}
                          </span>
                        </div>
                        <div className="perms-email">{row.desc}</div>
                      </div>
                    </div>
                  </td>
                  {MODULES.flatMap(m => m.actions.map(a => (
                    <td key={`${m.key}-${a}`} className="perms-check-cell">
                      <input
                        type="checkbox"
                        className="perms-checkbox"
                        checked={getRoleVal(row, m.key, a)}
                        disabled={roleTableMissing || savingRole === row.role_type}
                        onChange={e => toggleRole(row.role_type, m.key, a, e.target.checked)}
                      />
                    </td>
                  )))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Admin Permissions ── */}
      <div className="perms-section-label" style={{ marginTop: '1.5rem' }}>Admin Permissions</div>

      {adminLoading ? (
        <div className="perms-state">Loading…</div>
      ) : adminRows.length === 0 ? (
        <div className="perms-state">No admin accounts found.</div>
      ) : (
        <div className="perms-table-wrap">
          <table className="perms-table">
            <TableHeader labelCol="Admin" />
            <tbody>
              {adminRows.map(row => (
                <tr key={row.admin_id} className={`perms-row${savingAdmin === row.admin_id ? ' saving' : ''}`}>
                  <td className="perms-sticky">
                    <div className="perms-user-cell">
                      <div className="perms-avatar">{row.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="perms-name">{row.name}</div>
                        <div className="perms-email">{row.email}</div>
                        {row.is_super && <div className="perms-super-tag">Super Admin · all access</div>}
                      </div>
                    </div>
                  </td>
                  {MODULES.flatMap(m => m.actions.map(a => (
                    <td key={`${m.key}-${a}`} className="perms-check-cell">
                      <input
                        type="checkbox"
                        className="perms-checkbox"
                        checked={getAdminVal(row, m.key, a)}
                        disabled={row.is_super || savingAdmin === row.admin_id}
                        onChange={e => toggleAdmin(row.admin_id, m.key, a, e.target.checked, row.is_super)}
                      />
                    </td>
                  )))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
