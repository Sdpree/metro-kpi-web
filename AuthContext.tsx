import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

type AuthState = {
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | undefined>(undefined)

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, primary_store_id')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    const s = (await supabase.auth.getSession()).data.session
    if (!s?.user?.id) {
      setProfile(null)
      return
    }
    const p = await fetchProfile(s.user.id)
    setProfile(p)
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user?.id) {
        try {
          const p = await fetchProfile(data.session.user.id)
          if (mounted) setProfile(p)
        } catch (e) {
          console.error(e)
          if (mounted) setProfile(null)
        }
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      if (s?.user?.id) {
        try {
          const p = await fetchProfile(s.user.id)
          setProfile(p)
        } catch (e) {
          console.error(e)
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = useMemo<AuthState>(() => ({ session, profile, loading, refreshProfile, signOut }), [session, profile, loading])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
