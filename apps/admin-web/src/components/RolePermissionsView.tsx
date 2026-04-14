import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { MODULES } from '../context/PermissionsContext'
import type { Module, Action, ModulePerms } from '../context/PermissionsContext'

// ─── User role capability cards ──────────────────────────────────────────────
interface RoleCapability { label: string; access: 'full' | 'partial' | 'none' }
interface RoleDef { key: string; label: string; color: string; bg: string; desc: string; caps: RoleCapability[] }

const USER_ROLES: RoleDef[] = [
  {
    key: 'donor', label: 'Donor', color: '#166534', bg: '#dcfce7',
    desc: 'Household users who schedule pickups and earn recycling rewards.',
    caps: [
      { label: 'Schedule Pickups',    access: 'full'    },
      { label: 'View Own Pickups',    access: 'full'    },
      { label: 'Browse Rewards',      access: 'full'    },
      { label: 'Redeem Rewards',      access: 'full'    },
      { label: 'Scan QR at Pickup',   access: 'full'    },
      { label: 'Waste Classification',access: 'full'    },
      { label: 'View Profile',        access: 'full'    },
      { label: 'Manage Collectors',   access: 'none'    },
      { label: 'Admin Controls',      access: 'none'    },
    ],
  },
  {
    key: 'sponsor', label: 'Sponsor', color: '#92400e', bg: '#fef3c7',
    desc: 'Partner brands that fund rewards and run CSR campaigns.',
    caps: [
      { label: 'Create/Edit Rewards', access: 'full'    },
      { label: 'View Own Rewards',    access: 'full'    },
      { label: 'Redemption Analytics',access: 'full'    },
      { label: 'View Campaign Stats', access: 'full'    },
      { label: 'Manage Profile',      access: 'full'    },
      { label: 'Approve Pickups',     access: 'none'    },
      { label: 'Manage Collectors',   access: 'none'    },
      { label: 'Admin Controls',      access: 'none'    },
    ],
  },
  {
    key: 'collector', label: 'Collector', color: '#1e40af', bg: '#dbeafe',
    desc: 'Field staff who collect recyclables and complete pickups.',
    caps: [
      { label: 'View Assigned Pickups',access: 'full'   },
      { label: 'Update Pickup Status', access: 'full'   },
      { label: 'Scan QR at Collection',access: 'full'   },
      { label: 'View Assigned Routes', access: 'full'   },
      { label: 'Waste Classification', access: 'full'   },
      { label: 'GPS Location Sharing', access: 'full'   },
      { label: 'Create Rewards',       access: 'none'   },
      { label: 'Admin Controls',       access: 'none'   },
    ],
  },
]

const ACCESS_ICON: Record<RoleCapability['access'], string> = {
  full: '✓', partial: '◐', none: '✕',
}

type StoredPerms = Partial<Record<Module, ModulePerms>>

interface AdminRow {
  admin_id:    string
  permissions: StoredPerms
  name:        string
  email:       string
  is_super:    boolean
}

const ACTION_LABELS: Record<Action, string> = {
  read:   'Read',
  write:  'Write',
  modify: 'Edit',
  delete: 'Delete',
}

export default function RolePermissionsView() {
  const { toast }             = useToast()
  const [rows, setRows]       = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('admins')
      .select('admin_id, role_type, permissions, users(full_name, email)')
    setRows((data ?? []).map((a: any) => ({
      admin_id:    a.admin_id,
      permissions: a.permissions ?? {},
      name:        a.users?.full_name ?? 'Unknown',
      email:       a.users?.email ?? '',
      is_super:    a.role_type === 'super_admin',
    })))
    setLoading(false)
  }

  const toggle = async (adminId: string, module: Module, action: Action, val: boolean, isSuperAdmin: boolean) => {
    if (isSuperAdmin) return
    setSaving(adminId)
    setRows(prev => prev.map(r => {
      if (r.admin_id !== adminId) return r
      const updated: StoredPerms = {
        ...r.permissions,
        [module]: { ...r.permissions[module], [action]: val },
      }
      return { ...r, permissions: updated }
    }))
    const row = rows.find(r => r.admin_id === adminId)!
    const updated: StoredPerms = {
      ...row.permissions,
      [module]: { ...row.permissions[module], [action]: val },
    }
    const { error } = await supabase.from('admins').update({ permissions: updated }).eq('admin_id', adminId)
    if (error) { toast(error.message, 'error'); load() }
    setSaving(null)
  }

  const getVal = (row: AdminRow, module: Module, action: Action): boolean => {
    if (row.is_super) return true
    return row.permissions[module]?.[action] ?? false
  }

  return (
    <div className="perms-view">
      <div className="perms-view-header">
        <h2 className="perms-view-title">Role &amp; Permissions</h2>
        <p className="perms-view-sub">
          Control what each admin account can do per module. Super admins always have full access.
        </p>
      </div>

      {/* ── User role capability cards ── */}
      <div className="perms-roles-section">
        <div className="perms-roles-heading">User Role Capabilities</div>
        <div className="perms-roles-grid">
          {USER_ROLES.map(role => (
            <div key={role.key} className="perms-role-card">
              <div className="perms-role-card-header">
                <span className="perms-role-badge" style={{ background: role.bg, color: role.color }}>
                  {role.label}
                </span>
                <span className="perms-role-desc">{role.desc}</span>
              </div>
              <ul className="perms-role-caps">
                {role.caps.map(cap => (
                  <li key={cap.label} className={`perms-role-cap perms-role-cap-${cap.access}`}>
                    <span className="perms-role-cap-icon">{ACCESS_ICON[cap.access]}</span>
                    {cap.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="perms-roles-heading" style={{ padding: '0 1.5rem', marginBottom: '0.5rem' }}>
        Admin Permissions
      </div>

      {loading ? (
        <div className="perms-state">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="perms-state">No admin accounts found.</div>
      ) : (
        <div className="perms-table-wrap">
          <table className="perms-table">
            <thead>
              {/* Row 1: module group headers */}
              <tr>
                <th className="perms-th-user perms-sticky" rowSpan={2}>Admin</th>
                {MODULES.map(m => (
                  <th
                    key={m.key}
                    className="perms-th-module"
                    colSpan={m.actions.length}
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
              {/* Row 2: action labels */}
              <tr>
                {MODULES.flatMap(m =>
                  m.actions.map(a => (
                    <th key={`${m.key}-${a}`} className="perms-th-action">
                      {ACTION_LABELS[a]}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.admin_id} className={`perms-row${saving === row.admin_id ? ' saving' : ''}`}>
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
                  {MODULES.flatMap(m =>
                    m.actions.map(a => (
                      <td key={`${m.key}-${a}`} className="perms-check-cell">
                        <input
                          type="checkbox"
                          className="perms-checkbox"
                          checked={getVal(row, m.key, a)}
                          disabled={row.is_super || saving === row.admin_id}
                          onChange={e => toggle(row.admin_id, m.key, a, e.target.checked, row.is_super)}
                        />
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
