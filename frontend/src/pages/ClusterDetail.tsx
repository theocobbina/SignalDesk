import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PriorityBadge, SafetyBadge, StatusBadge } from '../components/badges'
import { CLUSTERS_CHANGED, getCluster, resolveCluster, type ClusterDetail as Cluster } from '../lib/api'
import { timeAgo } from '../lib/format'

const OPEN = new Set(['new', 'needs_review', 'triaged', 'in_progress'])

export default function ClusterDetail() {
  const id = Number(useParams().id)
  const [cluster, setCluster] = useState<Cluster | null>(null)
  const [note, setNote] = useState('')
  const [resolveRequests, setResolveRequests] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCluster(id).then(setCluster).catch((e) => setError(e.message))
  }, [id])

  async function close(status: 'resolved' | 'dismissed') {
    setSaving(true)
    setError(null)
    try {
      setCluster(await resolveCluster(id, { status, note: note || undefined, resolve_requests: resolveRequests }))
      window.dispatchEvent(new Event(CLUSTERS_CHANGED))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (error && !cluster) return <p className="text-red-600">{error}</p>
  if (!cluster) return <p className="text-gray-500">Loading…</p>

  const openCount = cluster.requests.filter((r) => OPEN.has(r.status)).length
  const active = cluster.status === 'active'

  return (
    <div>
      <Link to="/issues" className="text-sm text-gray-500 hover:text-gray-900">
        ← Emerging issues
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={`rounded-lg border p-6 shadow-sm ${active ? 'border-red-200 bg-red-50' : 'bg-white'}`}>
            <p className={`text-xs font-semibold tracking-wide uppercase ${active ? 'text-red-700' : 'text-gray-500'}`}>
              {active ? '🚨 Emerging issue' : cluster.status === 'resolved' ? '✅ Resolved' : 'Dismissed'} #{cluster.id}
            </p>
            <h1 className="mt-1 text-xl font-semibold">
              {cluster.request_count} reports about {cluster.category?.name.toLowerCase() ?? 'a similar problem'} in{' '}
              {cluster.building?.name}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              First reported {timeAgo(cluster.first_seen)}, latest {timeAgo(cluster.last_seen)}. Likely one underlying
              cause.
            </p>
            {cluster.resolution_note && (
              <p className="mt-3 text-sm">
                <span className="font-medium">Resolution:</span> {cluster.resolution_note}
              </p>
            )}
          </section>

          <section className="rounded-lg border bg-white shadow-sm">
            <h2 className="border-b px-4 py-3 font-semibold">Reports in this issue</h2>
            <ul className="divide-y">
              {cluster.requests.map((r) => (
                <li key={r.id}>
                  <Link to={`/requests/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-gray-50">
                    <span className="w-10 text-sm text-gray-400">#{r.id}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.title}</p>
                      <p className="truncate text-xs text-gray-500">
                        {r.room && `Room ${r.room} · `}
                        {r.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.safety_hazard && <SafetyBadge />}
                      <PriorityBadge priority={r.priority} />
                      <StatusBadge status={r.status} />
                      <span className="w-16 text-right text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {active && (
          <aside className="space-y-4 self-start rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Close this issue</h2>
            <label className="block text-sm font-medium">
              Resolution note
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Boiler repaired, hot water restored"
                className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={resolveRequests}
                onChange={(e) => setResolveRequests(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Also mark the {openCount} open report{openCount === 1 ? '' : 's'} as resolved
              </span>
            </label>
            <button
              disabled={saving}
              onClick={() => close('resolved')}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Resolve issue
            </button>
            <button
              disabled={saving}
              onClick={() => close('dismissed')}
              className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Not related, dismiss
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </aside>
        )}
      </div>
    </div>
  )
}
