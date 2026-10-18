import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Profile } from './api'

export type AuthState = {
  /** undefined while we're still checking for a saved login */
  session: Session | null | undefined
  profile: Profile | null
  /** Set when the profile couldn't be loaded (e.g. backend not running) */
  profileError: string | null
  isStaff: boolean
  isAdmin: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
