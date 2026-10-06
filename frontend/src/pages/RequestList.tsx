import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ClusterCard from '../components/ClusterCard'
import { PriorityBadge, SafetyBadge, StatusBadge } from '../components/badges'
import { STATUS_LABELS } from '../lib/labels'
import {
  getBuildings,
  getCategories,
  listClusters,
  listRequests,
  type Building,
  type Category,
  type Cluster,
  type DormRequest,
  type RequestFilters,
  type RequestStatus,
} from '../lib/api'
import { timeAgo } from '../lib/format'

const select = 'rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm'

export default function RequestList() {
  const [requests, setRequests] = useState<DormRequest[] | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [filters, setFilters] = useState<RequestFilters>({})
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getBuildings().then(setBuildings)
    getCategories().then(setCategories)
    listClusters('active').then(setClusters).catch(() => {})
  }, [])

  useEffect(() => {
    // Debounce typing in the search box.
    const t = setTimeout(() => {
      listRequests({ ...filters, q: search })
        .then(setRequests)
        .catch((e) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [filters, search])

  const setFilter = (key: keyof RequestFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value || undefined }))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Requests</h1>
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className={`${select} w-40`}
          />
          <select className={select} onChange={(e) => setFilter('status', e.target.value as RequestStatus)}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className={select} onChange={(e) => setFilter('building_id', e.target.value)}>
            <option value="">All buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select className={select} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {clusters.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {clusters.slice(0, 2).map((c) => (
            <ClusterCard key={c.id} cluster={c} />
          ))}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-hidden rounded-lg border bg-white shadow-sm">
        {requests === null ? (
          <p className="p-6 text-sm text-gray-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No requests match these filters.</p>
        ) : (
          <ul className="divide-y">
            {requests.map((r) => (
              <li key={r.id}>
                <Link to={`/requests/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-gray-50">
                  <span className="w-10 text-sm text-gray-400">#{r.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="text-xs text-gray-500">
                      {r.building?.name}
                      {r.room && ` · Room ${r.room}`}
                      {r.category && ` · ${r.category.name}`}
                      {r.team && ` · ${r.team.name}`}
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
        )}
      </div>
    </div>
  )
}
