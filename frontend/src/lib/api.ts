export type RequestStatus =
  | 'new'
  | 'needs_review'
  | 'triaged'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'rejected'

export type Building = { id: number; code: string; name: string }
export type Team = { id: number; slug: string; name: string; description: string | null }
export type Category = { slug: string; name: string; description: string; default_team_id: number | null }

export type StatusHistory = {
  from_status: RequestStatus | null
  to_status: RequestStatus
  note: string | null
  created_at: string
}

export type DormRequest = {
  id: number
  title: string
  description: string
  room: string | null
  status: RequestStatus
  priority: number | null
  safety_hazard: boolean
  building: Building | null
  category: Category | null
  team: Team | null
  duplicate_of: number | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export type Prediction = {
  model: string
  category_slug: string | null
  category_confidence: number | null
  category_probs: Record<string, number> | null
  priority_score: number | null
  priority_confidence: number | null
  priority_probs: Record<string, number> | null
  safety_hazard_prob: number | null
  cost_usd: number | null
  latency_ms: number | null
  created_at: string
}

export type DormRequestDetail = DormRequest & { history: StatusHistory[]; predictions: Prediction[] }

export type NewRequest = {
  building_id: number
  room?: string
  title: string
  description: string
}

export type RequestChanges = Partial<{
  status: RequestStatus
  priority: number
  category_slug: string
  team_id: number
  duplicate_of: number
  note: string
}>

export type RequestFilters = Partial<{
  status: RequestStatus
  building_id: number
  category: string
  team_id: number
  q: string
}>

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail = body?.detail
    throw new Error(
      typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : `HTTP ${res.status}`,
    )
  }
  return res.json()
}

export const getBuildings = () => api<Building[]>('/buildings')
export const getCategories = () => api<Category[]>('/categories')
export const getTeams = () => api<Team[]>('/teams')

export function listRequests(filters: RequestFilters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  return api<DormRequest[]>(`/requests?${params}`)
}

export const getRequest = (id: number) => api<DormRequestDetail>(`/requests/${id}`)

export const createRequest = (body: NewRequest) =>
  api<DormRequestDetail>('/requests', { method: 'POST', body: JSON.stringify(body) })

export const updateRequest = (id: number, changes: RequestChanges) =>
  api<DormRequestDetail>(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })

export const retriageRequest = (id: number) =>
  api<DormRequestDetail>(`/requests/${id}/triage`, { method: 'POST' })

export type SimilarRequest = { request: DormRequest; similarity: number }

export const findSimilarToDraft = (draft: { title: string; description: string; building_id?: number }) =>
  api<SimilarRequest[]>('/requests/similar', { method: 'POST', body: JSON.stringify(draft) })

export const getSimilar = (id: number) => api<SimilarRequest[]>(`/requests/${id}/similar`)
