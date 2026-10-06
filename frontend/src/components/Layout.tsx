import { NavLink, Outlet } from 'react-router-dom'

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
  }`

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
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
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
