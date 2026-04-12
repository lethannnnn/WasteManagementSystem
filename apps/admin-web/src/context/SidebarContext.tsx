import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  toggle:    () => void
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, toggle: () => {} })

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  const toggle = useCallback(() => {
    setCollapsed(v => {
      const next = !v
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }, [])

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
