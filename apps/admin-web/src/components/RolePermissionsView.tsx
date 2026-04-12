import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { MODULES } from '../context/PermissionsContext'
import type { Module, Action, ModulePerms } from '../context/PermissionsContext'

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
