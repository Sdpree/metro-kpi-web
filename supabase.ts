import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  // This is intentionally a runtime error in dev so you don’t silently run without env vars.
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in Netlify Environment Variables and/or local .env')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
