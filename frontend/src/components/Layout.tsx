import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CLUSTERS_CHANGED, listClusters } from '../lib/api'
import { useAuth } from '../lib/authContext'

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

export default function Layout() {
  const { profile, isStaff, isAdmin, signOut } = useAuth()
  const [activeIssues, setActiveIssues] = useState(0)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Staff only: refresh the alert count when the page changes or an issue is closed.
  useEffect(() => {
    if (!isStaff) return
    const refresh = () =>
      listClusters('active')
        .then((c) => setActiveIssues(c.length))
        .catch(() => {})
    refresh()
    window.addEventListener(CLUSTERS_CHANGED, refresh)
    return () => window.removeEventListener(CLUSTERS_CHANGED, refresh)
  }, [pathname, isStaff])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <NavLink to="/" className="text-lg font-bold tracking-tight">
            Signal<span className="text-blue-600">Desk</span>
          </NavLink>

          {profile && (
            <nav className="flex flex-wrap items-center gap-1">
              <NavLink to="/" end className={link}>
                Report issue
              </NavLink>
              <NavLink to="/requests" className={link}>
                {isStaff ? 'Requests' : 'My reports'}
              </NavLink>
              {isStaff && (
                <>
                  <NavLink to="/dashboard" className={link}>
                    Dashboard
                  </NavLink>
                  <NavLink to="/issues" className={link}>
                    Emerging
                    {activeIssues > 0 && (
                      <span className="rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                        {activeIssues}
                      </span>
                    )}
                  </NavLink>
                </>
              )}
              {isAdmin && (
                <NavLink to="/users" className={link}>
                  Users
                </NavLink>
              )}

              <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
              <NavLink to="/profile" className={link} title={profile.email ?? undefined}>
                {profile.full_name || 'Profile'}
                {profile.role !== 'student' && (
                  <span className="rounded bg-gray-100 px-1 text-xs text-gray-600 capitalize">{profile.role}</span>
                )}
              </NavLink>
              <button
                onClick={async () => {
                  await signOut()
                  navigate('/login')
                }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Sign out
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
