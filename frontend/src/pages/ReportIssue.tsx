import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import SimilarList from '../components/SimilarList'
import {
  createRequest,
  findSimilarToDraft,
  getBuildings,
  type Building,
  type DormRequestDetail,
  type SimilarRequest,
} from '../lib/api'
import { PRIORITY_LABELS } from '../lib/labels'

const input =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'

export default function ReportIssue() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingId, setBuildingId] = useState('')
  const [room, setRoom] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<DormRequestDetail | null>(null)
  const [similar, setSimilar] = useState<SimilarRequest[]>([])

  useEffect(() => {
    getBuildings().then(setBuildings).catch((e) => setError(e.message))
  }, [])

  // While the student types, look for open reports of the same problem in their building.
  useEffect(() => {
    if (description.trim().length < 15) return
    const t = setTimeout(() => {
      findSimilarToDraft({ title, description, building_id: buildingId ? Number(buildingId) : undefined })
        .then(setSimilar)
        .catch(() => setSimilar([]))
    }, 600)
    return () => clearTimeout(t)
  }, [title, description, buildingId])
  const shownSimilar = description.trim().length >= 15 ? similar : []

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const req = await createRequest({
        building_id: Number(buildingId),
        room: room || undefined,
        title,
        description,
      })
      setCreated(req)
      setRoom('')
      setTitle('')
      setDescription('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">✅</div>
        <h1 className="mt-2 text-xl font-semibold">Report submitted</h1>
        <p className="mt-1 text-gray-600">
          Your request <span className="font-medium">#{created.id}</span> has been received.
        </p>
        {created.team ? (
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
            Sent to <span className="font-semibold">{created.team.name}</span>
            {created.category && <> as {created.category.name}</>}
            {created.priority !== null && <> · {PRIORITY_LABELS[created.priority]} priority</>}
            {created.status === 'needs_review' && (
              <p className="mt-1 text-xs text-gray-500">A staff member will double-check the details.</p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">A staff member will review it shortly.</p>
        )}
        {created.safety_hazard && (
          <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
            ⚠ This looks like a safety hazard. If anyone is in danger, call campus security now.
          </p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <Link to={`/requests/${created.id}`} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
            View request
          </Link>
          <button onClick={() => setCreated(null)} className="rounded-md border px-4 py-2 text-sm font-medium">
            Report another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">Report a dorm issue</h1>
      <p className="mt-1 text-sm text-gray-600">Describe the problem and we'll route it to the right team.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Building
            <select required value={buildingId} onChange={(e) => setBuildingId(e.target.value)} className={input}>
              <option value="" disabled>
                Select…
              </option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Room <span className="font-normal text-gray-400">(optional)</span>
            <input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={20} placeholder="e.g. B-104" className={input} />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Short title
          <input
            required
            minLength={3}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. No hot water in shower"
            className={input}
          />
        </label>

        <label className="block text-sm font-medium">
          What's happening?
          <textarea
            required
            minLength={10}
            maxLength={4000}
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When did it start? Where exactly? Is anything damaged or dangerous?"
            className={input}
          />
        </label>

        {shownSimilar.length > 0 && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-900">
              Similar {shownSimilar.length === 1 ? 'report is' : 'reports are'} already open
            </p>
            <p className="text-xs text-blue-800">
              Staff may already be working on this. You can still submit. More reports help show how widespread it is.
            </p>
            <div className="mt-2 rounded bg-white px-3">
              <SimilarList matches={shownSimilar} />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </div>
  )
}
