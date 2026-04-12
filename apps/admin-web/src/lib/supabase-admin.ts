import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase env vars for admin client')
}

// Service role client — admin operations only (collector creation, etc.)
// This key bypasses RLS. Only use in admin-web, never in mobile/sponsor apps.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession:   false,
    storageKey:       'sb-admin-service-role',
  },
})
