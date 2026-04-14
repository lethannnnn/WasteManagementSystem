import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export interface Sponsor {
  id:                 string
  company_name:       string
  partnership_status: string
  email:              string
}

interface AuthCtx {
  sponsor:      Sponsor | null
  loading:      boolean
  isFirstLogin: boolean
  signOut:      () => Promise<void>
}

const Ctx = createContext<AuthCtx>({ sponsor: null, loading: true, isFirstLogin: false, signOut: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sponsor, setSponsor]           = useState<Sponsor | null>(null)
  const [loading, setLoading]           = useState(true)
  const [isFirstLogin, setIsFirstLogin] = useState(false)

  useEffect(() => {
    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setSponsor(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN') {
        setLoading(true)
        load()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setSponsor(null); return }

      const { data, error } = await supabase
        .from('sponsors')
        .select('sponsor_id, company_name, partnership_status')
        .eq('user_id', session.user.id)
        .single()

      if (error || !data) { setSponsor(null); return }

      setSponsor({
        id:                 data.sponsor_id,
        company_name:       data.company_name,
        partnership_status: data.partnership_status,
        email:              session.user.email ?? '',
      })

      // Mark first login — check current value first to avoid redundant writes
      const { data: userRow } = await supabase
        .from('users')
        .select('has_logged_in')
        .eq('user_id', session.user.id)
        .single()
      if (userRow && !userRow.has_logged_in) {
        await supabase.from('users').update({ has_logged_in: true }).eq('user_id', session.user.id)
        setIsFirstLogin(true)
      }
    } catch {
      setSponsor(null)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => { await supabase.auth.signOut(); setSponsor(null); setIsFirstLogin(false) }

  return (
    <Ctx.Provider value={{ sponsor, loading, isFirstLogin, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
