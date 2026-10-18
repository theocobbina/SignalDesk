import { useEffect, useState, type FormEvent } from 'react'
import { getBuildings, updateMe, type Building } from '../lib/api'
import { useAuth } from '../lib/authContext'

const input =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'

const ROLE_LABELS = { student: 'Student', staff: 'Staff', admin: 'Admin' }

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [buildingId, setBuildingId] = useState(profile?.building ? String(profile.building.id) : '')
  const [room, setRoom] = useState(profile?.room ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    getBuildings().then(setBuildings)
  }, [])

  if (!profile) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await updateMe({ full_name: fullName, building_id: buildingId ? Number(buildingId) : null, room: room || null })
      await refreshProfile()
      setMessage({ ok: true, text: 'Saved.' })
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <p className="mt-1 text-sm text-gray-600">
        Your building and room are filled in automatically when you report an issue.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          <span>{profile.email}</span>
          <span>
            Role: <span className="font-medium text-gray-900">{ROLE_LABELS[profile.role]}</span>
          </span>
          {profile.team && (
            <span>
              Team: <span className="font-medium text-gray-900">{profile.team.name}</span>
            </span>
          )}
        </div>

        <label className="block text-sm font-medium">
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} className={input} />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Building
            <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className={input}>
              <option value="">Not set</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Room
            <input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={20} placeholder="e.g. B-104" className={input} />
          </label>
        </div>

        {message && <p className={`text-sm ${message.ok ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}
