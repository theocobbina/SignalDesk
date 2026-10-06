import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AiTriagePanel from '../components/AiTriagePanel'
import SimilarList from '../components/SimilarList'
import { PriorityBadge, SafetyBadge, StatusBadge } from '../components/badges'
import { PRIORITY_LABELS, STATUS_LABELS } from '../lib/labels'
import {
  getCategories,
  getRequest,
  getSimilar,
  getTeams,
  retriageRequest,
  updateRequest,
  type Category,
  type DormRequestDetail,
  type RequestChanges,
  type RequestStatus,
  type SimilarRequest,
  type Team,
} from '../lib/api'
import { timeAgo } from '../lib/format'

// Typical next steps for each status; any status can still be picked from the dropdown.
const NEXT_STEPS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  new: ['triaged', 'rejected'],
  needs_review: ['triaged', 'rejected'],
  triaged: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
}

const select = 'mt-1 block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm'

export default function RequestDetail() {
  const id = Number(useParams().id)
  const [req, setReq] = useState<DormRequestDetail | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [similar, setSimilar] = useState<SimilarRequest[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRequest(id).then(setReq).catch((e) => setError(e.message))
    getTeams().then(setTeams)
    getCategories().then(setCategories)
    getSimilar(id).then(setSimilar).catch(() => setSimilar([]))
  }, [id])

  async function run(action: () => Promise<DormRequestDetail>) {
    setSaving(true)
    setError(null)
    try {
      setReq(await action())
      setNote('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const save = (changes: RequestChanges) => run(() => updateRequest(id, { ...changes, ...(note && { note }) }))
  const retriage = () => run(() => retriageRequest(id))
  const markDuplicate = (originalId: number) =>
    run(() => updateRequest(id, { duplicate_of: originalId, status: 'closed', note: `Duplicate of #${originalId}` }))

  if (error && !req) return <p className="text-red-600">{error}</p>
  if (!req) return <p className="text-gray-500">Loading…</p>

  return (
    <div>
      <Link to="/requests" className="text-sm text-gray-500 hover:text-gray-900">
        ← All requests
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        {/* Left: the report and its timeline */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-400">#{req.id}</span>
              <StatusBadge status={req.status} />
              <PriorityBadge priority={req.priority} />
              {req.safety_hazard && <SafetyBadge />}
            </div>
            <h1 className="mt-2 text-xl font-semibold">{req.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {req.building?.name}
              {req.room && ` · Room ${req.room}`} · reported {timeAgo(req.created_at)}
            </p>
            <p className="mt-4 whitespace-pre-wrap text-gray-800">{req.description}</p>
          </section>

          {req.cluster_id && (
            <Link
              to={`/issues/${req.cluster_id}`}
              className="block rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 hover:bg-red-100/60"
            >
              🚨 Part of <span className="font-semibold">emerging issue #{req.cluster_id}</span>: other residents in this building
              reported something similar. View all reports →
            </Link>
          )}

          {req.duplicate_of && (
            <div className="rounded-lg border bg-gray-100 p-4 text-sm text-gray-700">
              Closed as a duplicate of{' '}
              <Link to={`/requests/${req.duplicate_of}`} className="font-semibold text-blue-700 hover:underline">
                #{req.duplicate_of}
              </Link>
              .
            </div>
          )}

          {req.status === 'needs_review' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <span className="font-semibold">Needs review.</span> The AI wasn't confident about this one. Check the
              category and team, then mark it triaged.
            </div>
          )}

          <AiTriagePanel prediction={req.predictions[0]} categories={categories} onRetriage={retriage} busy={saving} />

          {similar.length > 0 && (
            <section className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="font-semibold">Possible duplicates</h2>
              <p className="mt-1 text-xs text-gray-500">Reports in the same building describing a similar problem.</p>
              <div className="mt-2">
                <SimilarList
                  matches={similar}
                  action={(m) =>
                    !req.duplicate_of && (
                      <button
                        disabled={saving}
                        onClick={() => markDuplicate(m.request.id)}
                        className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                      >
                        Mark duplicate
                      </button>
                    )
                  }
                />
              </div>
            </section>
          )}

          <section className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Timeline</h2>
            <ol className="mt-4 space-y-4 border-l pl-4">
              {req.history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-gray-300" />
                  <p className="text-sm">
                    {h.from_status && h.from_status !== h.to_status ? (
                      <>
                        {STATUS_LABELS[h.from_status]} → <span className="font-medium">{STATUS_LABELS[h.to_status]}</span>
                      </>
                    ) : h.from_status === null ? (
                      <span className="font-medium">Submitted</span>
                    ) : (
                      <span className="font-medium">Comment</span>
                    )}
                    <span className="ml-2 text-xs text-gray-400">{new Date(h.created_at).toLocaleString()}</span>
                  </p>
                  {h.note && h.note !== 'Submitted' && <p className="mt-0.5 text-sm text-gray-600">{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right: staff controls */}
        <aside className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Manage</h2>

          <label className="block text-sm font-medium">
            Note <span className="font-normal text-gray-400">(added to timeline)</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Plumber scheduled for 2pm"
              className={select}
            />
          </label>

          {NEXT_STEPS[req.status] && (
            <div className="flex flex-wrap gap-2">
              {NEXT_STEPS[req.status]!.map((s) => (
                <button
                  key={s}
                  disabled={saving}
                  onClick={() => save({ status: s })}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  Mark {STATUS_LABELS[s].toLowerCase()}
                </button>
              ))}
            </div>
          )}
          {note && (
            <button disabled={saving} onClick={() => save({})} className="text-sm font-medium text-blue-600 hover:underline">
              Add note only
            </button>
          )}

          <hr />

          <label className="block text-sm font-medium">
            Status
            <select className={select} value={req.status} disabled={saving} onChange={(e) => save({ status: e.target.value as RequestStatus })}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Priority
            <select
              className={select}
              value={req.priority ?? ''}
              disabled={saving}
              onChange={(e) => save({ priority: Number(e.target.value) })}
            >
              {req.priority === null && <option value="">Unrated</option>}
              {PRIORITY_LABELS.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Category
            <select
              className={select}
              value={req.category?.slug ?? ''}
              disabled={saving}
              onChange={(e) => save({ category_slug: e.target.value })}
            >
              {!req.category && <option value="">Uncategorized</option>}
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Assigned team
            <select
              className={select}
              value={req.team?.id ?? ''}
              disabled={saving}
              onChange={(e) => save({ team_id: Number(e.target.value) })}
            >
              {!req.team && <option value="">Unassigned</option>}
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </aside>
      </div>
    </div>
  )
}
