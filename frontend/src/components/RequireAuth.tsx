import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/authContext'

type Props = { children: ReactNode; role?: 'staff' | 'admin' }

/** Sends signed-out visitors to /login, and hides staff/admin pages from everyone else. */
export default function RequireAuth({ children, role }: Props) {
  const { session, profile, profileError, isStaff, isAdmin, signOut } = useAuth()
  const location = useLocation()

  if (session && profileError) {
    return (
      <div className="mx-auto max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
        <h1 className="font-semibold">Couldn't load your account</h1>
        <p className="mt-1 text-sm text-gray-600">{profileError}. Is the backend running?</p>
        <button onClick={signOut} className="mt-4 text-sm font-medium text-blue-600 hover:underline">
          Sign out
        </button>
      </div>
    )
  }
  if (session === undefined || (session && !profile)) {
    return <p className="p-8 text-center text-gray-500">Loading…</p>
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  const allowed = role === 'admin' ? isAdmin : role === 'staff' ? isStaff : true
  if (!allowed) {
    return (
      <div className="mx-auto max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
        <h1 className="font-semibold">No access</h1>
        <p className="mt-1 text-sm text-gray-600">This page is for {role === 'admin' ? 'admins' : 'staff'} only.</p>
      </div>
    )
  }
  return <>{children}</>
}
