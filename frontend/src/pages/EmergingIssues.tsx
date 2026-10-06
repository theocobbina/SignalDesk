import { useEffect, useState } from 'react'
import ClusterCard from '../components/ClusterCard'
import { listClusters, type Cluster, type ClusterStatus } from '../lib/api'

const TABS: { status: ClusterStatus; label: string }[] = [
  { status: 'active', label: 'Active' },
  { status: 'resolved', label: 'Resolved' },
  { status: 'dismissed', label: 'Dismissed' },
]

export default function EmergingIssues() {
  const [status, setStatus] = useState<ClusterStatus>('active')
  const [clusters, setClusters] = useState<Cluster[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listClusters(status)
      .then(setClusters)
      .catch((e) => setError(e.message))
  }, [status])

  return (
    <div>
      <h1 className="text-2xl font-semibold">Emerging issues</h1>
      <p className="mt-1 text-sm text-gray-600">
        Several similar reports from the same building in a short time usually mean one underlying problem, like a
        boiler failure or a building-wide Wi-Fi outage.
      </p>

      <div className="mt-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.status}
            onClick={() => {
              setClusters(null)
              setStatus(t.status)
            }}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              status === t.status ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {clusters === null ? (
        <p className="mt-6 text-sm text-gray-500">Loading…</p>
      ) : clusters.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          {status === 'active' ? 'No emerging issues right now. 🎉' : `No ${status} issues yet.`}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {clusters.map((c) => (
            <ClusterCard key={c.id} cluster={c} />
          ))}
        </div>
      )}
    </div>
  )
}
