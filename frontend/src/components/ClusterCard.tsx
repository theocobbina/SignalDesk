import { Link } from 'react-router-dom'
import type { Cluster } from '../lib/api'
import { timeAgo } from '../lib/format'
import { PriorityBadge } from './badges'

export default function ClusterCard({ cluster: c }: { cluster: Cluster }) {
  const active = c.status === 'active'
  return (
    <Link
      to={`/issues/${c.id}`}
      className={`block rounded-lg border p-4 shadow-sm transition hover:shadow ${
        active ? 'border-red-200 bg-red-50 hover:bg-red-100/60' : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold tracking-wide uppercase ${active ? 'text-red-700' : 'text-gray-500'}`}>
            {active ? '🚨 Emerging issue' : c.status === 'resolved' ? '✅ Resolved' : 'Dismissed'} · {c.building?.name}
          </p>
          <p className="mt-1 truncate font-semibold">{c.category?.name ?? c.title}</p>
          <p className="truncate text-sm text-gray-600">First report: “{c.title}”</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-bold tabular-nums ${active ? 'text-red-700' : 'text-gray-700'}`}>{c.request_count}</p>
          <p className="text-xs text-gray-500">reports</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <PriorityBadge priority={c.max_priority} />
        <span>
          {timeAgo(c.first_seen)} → latest {timeAgo(c.last_seen)}
        </span>
      </div>
    </Link>
  )
}
