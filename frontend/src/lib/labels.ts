import type { RequestStatus } from './api'

export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'New',
  needs_review: 'Needs review',
  triaged: 'Triaged',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
}

export const PRIORITY_LABELS = ['Low', 'Medium', 'High', 'Emergency']
