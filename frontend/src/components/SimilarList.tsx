import { Link } from 'react-router-dom'
import type { SimilarRequest } from '../lib/api'
import { timeAgo } from '../lib/format'
import { StatusBadge } from './badges'

type Props = {
  matches: SimilarRequest[]
  /** Optional per-row action, e.g. "Mark as duplicate". */
  action?: (match: SimilarRequest) => React.ReactNode
}

export default function SimilarList({ matches, action }: Props) {
  return (
    <ul className="divide-y">
      {matches.map((m) => (
        <li key={m.request.id} className="flex items-center gap-3 py-2">
          <span className="w-10 shrink-0 text-xs font-semibold text-blue-700 tabular-nums" title="Similarity">
            {Math.round(m.similarity * 100)}%
          </span>
          <div className="min-w-0 flex-1">
            <Link to={`/requests/${m.request.id}`} className="block truncate text-sm font-medium hover:underline">
              #{m.request.id} {m.request.title}
            </Link>
            <p className="text-xs text-gray-500">
              {m.request.building?.name}
              {m.request.room && ` · Room ${m.request.room}`} · {timeAgo(m.request.created_at)}
            </p>
          </div>
          <StatusBadge status={m.request.status} />
          {action?.(m)}
        </li>
      ))}
    </ul>
  )
}
