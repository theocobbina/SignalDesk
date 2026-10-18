import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getMe, type Profile } from '../lib/api'
import { AuthContext } from '../lib/authContext'
import { supabase } from '../lib/supabase'

/** Tracks the Supabase login session and loads the user's SignalDesk profile (role, building…). */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    try {
      setProfile(await getMe())
      setProfileError(null)
    } catch (e) {
      setProfile(null)
      setProfileError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    getMe()
      .then((p) => {
        setProfile(p)
        setProfileError(null)
      })
      .catch((e) => setProfileError((e as Error).message))
  }, [userId])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const role = profile?.role
  return (
    <AuthContext.Provider
      value={{
        session,
        // Don't expose a stale profile from a previous login.
        profile: session ? profile : null,
        profileError: session ? profileError : null,
        isStaff: role === 'staff' || role === 'admin',
        isAdmin: role === 'admin',
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
