import { useEffect, useState } from 'react'
import { getTeams, listUsers, updateUser, type Team, type UserRole, type UserRow } from '../lib/api'
import { useAuth } from '../lib/authContext'

const select = 'rounded-md border border-gray-300 bg-white px-2 py-1 text-sm disabled:opacity-50'

export default function Users() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
    getTeams().then(setTeams)
  }, [])

  async function save(id: string, changes: { role?: UserRole; team_id?: number | null }) {
    setSavingId(id)
    setError(null)
    try {
      const updated = await updateUser(id, changes)
      setUsers((us) => us?.map((u) => (u.id === id ? updated : u)) ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-1 text-sm text-gray-600">
        Everyone signs up as a student. Make maintenance and housing staff <strong>Staff</strong> and assign their
        team so they can manage requests.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white shadow-sm">
        {users === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Role</th>
                <th className="px-4 py-2 font-semibold">Team</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => {
                const isMe = u.id === profile?.id
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-2">
                      {u.full_name || <span className="text-gray-400">No name</span>}
                      {isMe && <span className="ml-1 text-xs text-gray-400">(you)</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{u.email}</td>
                    <td className="px-4 py-2">
                      <select
                        className={select}
                        value={u.role}
                        disabled={isMe || savingId === u.id}
                        title={isMe ? "You can't change your own role" : undefined}
                        onChange={(e) => save(u.id, { role: e.target.value as UserRole })}
                      >
                        <option value="student">Student</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        className={select}
                        value={u.team_id ?? ''}
                        disabled={u.role === 'student' || savingId === u.id}
                        onChange={(e) => save(u.id, { team_id: e.target.value ? Number(e.target.value) : null })}
                      >
                        <option value="">No team</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
