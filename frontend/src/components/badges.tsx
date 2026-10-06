import type { RequestStatus } from '../lib/api'
import { PRIORITY_LABELS, STATUS_LABELS } from '../lib/labels'

const STATUS_STYLES: Record<RequestStatus, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-200',
  needs_review: 'bg-amber-50 text-amber-800 ring-amber-200',
  triaged: 'bg-violet-50 text-violet-700 ring-violet-200',
  in_progress: 'bg-sky-50 text-sky-700 ring-sky-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  closed: 'bg-gray-100 text-gray-600 ring-gray-200',
  rejected: 'bg-gray-100 text-gray-500 ring-gray-200',
}

const PRIORITY_STYLES = [
  'bg-gray-100 text-gray-600 ring-gray-200',
  'bg-yellow-50 text-yellow-800 ring-yellow-200',
  'bg-orange-50 text-orange-700 ring-orange-200',
  'bg-red-600 text-white ring-red-600',
]

const pill = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`${pill} ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
}

export function PriorityBadge({ priority }: { priority: number | null }) {
  if (priority === null) return <span className={`${pill} bg-white text-gray-400 ring-gray-200`}>Unrated</span>
  return <span className={`${pill} ${PRIORITY_STYLES[priority]}`}>{PRIORITY_LABELS[priority]}</span>
}

export function SafetyBadge() {
  return <span className={`${pill} bg-red-50 text-red-700 ring-red-200`}>⚠ Safety hazard</span>
}
