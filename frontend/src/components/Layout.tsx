import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CLUSTERS_CHANGED, listClusters } from '../lib/api'

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

export default function Layout() {
  const [activeIssues, setActiveIssues] = useState(0)
  const { pathname } = useLocation()

  // Refresh the alert count when the page changes or an issue is closed.
  useEffect(() => {
    const refresh = () =>
      listClusters('active')
        .then((c) => setActiveIssues(c.length))
        .catch(() => {})
    refresh()
    window.addEventListener(CLUSTERS_CHANGED, refresh)
    return () => window.removeEventListener(CLUSTERS_CHANGED, refresh)
  }, [pathname])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <NavLink to="/" className="text-lg font-bold tracking-tight">
            Signal<span className="text-blue-600">Desk</span>
          </NavLink>
          <nav className="flex gap-1">
            <NavLink to="/" end className={link}>
              Report issue
            </NavLink>
            <NavLink to="/requests" className={link}>
              Requests
            </NavLink>
            <NavLink to="/issues" className={link}>
              Emerging
              {activeIssues > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">{activeIssues}</span>
              )}
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
