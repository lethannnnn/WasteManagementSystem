import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type Module = 'users' | 'rewards' | 'routes' | 'collectors' | 'analytics' | 'pickups'
export type Action = 'read' | 'write' | 'modify' | 'delete'
export type ModulePerms = Partial<Record<Action, boolean>>
export type Permissions = Record<Module, ModulePerms>

export const MODULES: { key: Module; label: string; actions: Action[] }[] = [
  { key: 'users',      label: 'Users',      actions: ['read', 'write', 'modify', 'delete'] },
  { key: 'rewards',    label: 'Rewards',    actions: ['read', 'write', 'modify', 'delete'] },
  { key: 'routes',     label: 'Routes',     actions: ['read', 'write', 'modify', 'delete'] },
  { key: 'collectors', label: 'Collectors', actions: ['read', 'write', 'modify', 'delete'] },
  { key: 'analytics',  label: 'Analytics',  actions: ['read']                              },
  { key: 'pickups',    label: 'Pickups',    actions: ['read', 'write', 'modify', 'delete'] },
]

function buildPerms(val: boolean): Permissions {
  return Object.fromEntries(
    MODULES.map(m => [m.key, Object.fromEntries(m.actions.map(a => [a, val]))])
  ) as Permissions
}

const ALL_TRUE  = buildPerms(true)
const ALL_FALSE = buildPerms(false)

function mergePerms(stored: any): Permissions {
  return Object.fromEntries(
    MODULES.map(m => [
      m.key,
      Object.fromEntries(m.actions.map(a => [a, stored?.[m.key]?.[a] ?? false])),
    ])
  ) as Permissions
}

interface PermCtx {
  permissions: Permissions
  loading:     boolean
  can:         (module: Module, action: Action) => boolean
  canRead:     (module: Module) => boolean
}

const PermissionsContext = createContext<PermCtx>({
  permissions: ALL_FALSE,
  loading:     true,
  can:         () => false,
  canRead:     () => false,
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<Permissions>(ALL_FALSE)
  const [loading, setLoading]         = useState(true)
  const initialDone                   = useRef(false)

  useEffect(() => {
    load(true)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setPermissions(ALL_FALSE)
      } else if (event === 'SIGNED_IN') {
        load(false) // silent — don't flash loading screen
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function load(showLoading: boolean) {
    if (showLoading && !initialDone.current) setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setPermissions(ALL_FALSE); setLoading(false); initialDone.current = true; return }

      const { data } = await supabase
        .from('admins')
        .select('role_type, permissions')
        .eq('user_id', session.user.id)
        .single()

      setPermissions(
        data?.role_type === 'super_admin' ? ALL_TRUE : mergePerms(data?.permissions)
      )
    } catch {
      setPermissions(ALL_FALSE)
    }

    setLoading(false)
    initialDone.current = true
  }

  return (
    <PermissionsContext.Provider value={{
      permissions,
      loading,
      can:     (module, action) => permissions[module]?.[action] ?? false,
      canRead: (module)         => permissions[module]?.read     ?? false,
    }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export const usePermissions = () => useContext(PermissionsContext)
