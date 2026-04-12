import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [adminName, setAdminName] = useState('Admin')

  useEffect(() => {
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) checkAdmin(session.user.id)
      else { setIsAdmin(false); setAdminName('Admin') }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await checkAdmin(session.user.id)
    else setIsAdmin(false)
  }

  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from('admins')
      .select('admin_id, users(full_name)')
      .eq('user_id', userId)
      .single()
    setIsAdmin(!!data)
    if (data) setAdminName((data as any).users?.full_name ?? 'Admin')
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { isAdmin, adminName, signOut }
}
