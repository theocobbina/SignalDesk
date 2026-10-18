import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarList, DailyColumns, StatTile } from '../components/charts'
import { ORDINAL_BLUES } from '../lib/chartColors'
import { getStats, type Stats } from '../lib/api'
import { PRIORITY_LABELS } from '../lib/labels'

const RANGES = [7, 30, 90]

const pct = (n: number | null) => (n == null ? '–' : `${Math.round(n * 100)}%`)

function duration(hours: number | null) {
  if (hours == null) return '–'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 48) return `${hours.toFixed(1)} h`
  return `${(hours / 24).toFixed(1)} days`
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function Dashboard() {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getStats(days)
      .then(setStats)
      .catch((e) => setError(e.message))
  }, [days])

  if (error) return <p className="text-red-600">{error}</p>
  if (!stats) return <p className="text-gray-500">Loading…</p>

  const { kpis, ai } = stats

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-600">Open work right now, and activity over the selected period.</p>
        </div>
        <div className="flex rounded-md border bg-white p-0.5 text-sm" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setDays(r)}
              aria-pressed={days === r}
              className={`rounded px-3 py-1 font-medium ${days === r ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      {/* Right now */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Open requests" value={String(kpis.open)} />
        <StatTile label="Urgent & open" value={String(kpis.urgent_open)} hint="Emergency or safety hazard" alert={kpis.urgent_open > 0} />
        <StatTile label="Needs review" value={String(kpis.needs_review)} hint="AI wasn't confident" />
        <StatTile label="Emerging issues" value={String(kpis.active_issues)} alert={kpis.active_issues > 0} />
        <StatTile label="Median time to resolve" value={duration(kpis.median_resolution_hours)} hint={`Last ${days} days`} />
      </div>

      <Card title="Reports per day" subtitle={`${kpis.reports} reports in the last ${days} days`}>
        <DailyColumns data={stats.daily} caption="Reports per day" />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="By category" subtitle={`Last ${days} days`}>
          <BarList
            caption="Reports by category"
            data={stats.by_category
              .filter((c) => c.count > 0)
              .map((c) => ({ label: c.name, value: c.count, detail: `${c.count} reports, ${c.open} still open` }))}
          />
        </Card>

        <Card title="By building" subtitle={`Last ${days} days`}>
          <BarList
            caption="Reports by building"
            data={stats.by_building.map((b) => ({ label: b.name, value: b.count, detail: `${b.count} reports, ${b.open} still open` }))}
          />
        </Card>

        <Card title="Open requests by priority" subtitle="Everything not yet resolved">
          <BarList
            caption="Open requests by priority"
            data={stats.open_by_priority.map((p) => ({
              label: PRIORITY_LABELS[p.priority],
              value: p.count,
              color: ORDINAL_BLUES[p.priority],
            }))}
          />
        </Card>

        <Card title="AI triage (Jev)" subtitle={`${ai.triaged} reports classified in the last ${days} days`}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-600">Routed automatically</dt>
              <dd className="text-xl font-semibold">{pct(ai.auto_routed_rate)}</dd>
              <dd className="text-xs text-gray-500">The rest went to human review</dd>
            </div>
            <div>
              <dt className="text-gray-600">Category kept by staff</dt>
              <dd className="text-xl font-semibold">{pct(ai.category_agreement)}</dd>
              <dd className="text-xs text-gray-500">Staff didn't change Jev's category</dd>
            </div>
            <div>
              <dt className="text-gray-600">Average response time</dt>
              <dd className="text-xl font-semibold">{ai.avg_latency_ms == null ? '–' : `${Math.round(ai.avg_latency_ms)} ms`}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Total AI cost</dt>
              <dd className="text-xl font-semibold">${(ai.cost_usd ?? 0).toFixed(4)}</dd>
              {ai.triaged > 0 && ai.cost_usd != null && (
                <dd className="text-xs text-gray-500">≈ ${((ai.cost_usd / ai.triaged) * 1000).toFixed(3)} per 1,000 reports</dd>
              )}
            </div>
          </dl>
          <Link to="/requests" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            Review requests →
          </Link>
        </Card>
      </div>
    </div>
  )
}
