import type { Category, Prediction } from '../lib/api'
import { PRIORITY_LABELS } from '../lib/labels'

const pct = (n: number | null | undefined) => (n == null ? '–' : `${Math.round(n * 100)}%`)

function Bar({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-28 truncate ${highlight ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${highlight ? 'bg-blue-600' : 'bg-gray-300'}`}
          style={{ width: `${Math.max(value * 100, 1)}%` }}
        />
      </div>
      <span className="w-9 text-right text-gray-500 tabular-nums">{pct(value)}</span>
    </div>
  )
}

type Props = {
  prediction: Prediction | undefined
  categories: Category[]
  onRetriage: () => void
  busy: boolean
}

export default function AiTriagePanel({ prediction: p, categories, onRetriage, busy }: Props) {
  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug

  const retriageButton = (
    <button
      onClick={onRetriage}
      disabled={busy}
      className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
    >
      {busy ? 'Running…' : p ? 'Re-run' : 'Run AI triage'}
    </button>
  )

  if (!p) {
    return (
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">AI triage</h2>
          {retriageButton}
        </div>
        <p className="mt-2 text-sm text-gray-500">This request hasn't been classified by Jev yet.</p>
      </section>
    )
  }

  const topCategories = Object.entries(p.category_probs ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
  const priorityProbs = Object.entries(p.priority_probs ?? {}).sort(([a], [b]) => Number(a) - Number(b))
  const hazard = p.safety_hazard_prob ?? 0

  return (
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">AI triage</h2>
        {retriageButton}
      </div>
      <p className="mt-1 text-xs text-gray-500">
        Suggested by {p.model} in {p.latency_ms} ms
        {p.cost_usd != null && ` · $${p.cost_usd.toFixed(6)}`}
      </p>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Category · {pct(p.category_confidence)} confident
          </h3>
          <div className="mt-2 space-y-1.5">
            {topCategories.map(([slug, prob]) => (
              <Bar key={slug} label={categoryName(slug)} value={prob} highlight={slug === p.category_slug} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Priority · {pct(p.priority_confidence)} confident
          </h3>
          <div className="mt-2 space-y-1.5">
            {priorityProbs.map(([level, prob]) => (
              <Bar
                key={level}
                label={PRIORITY_LABELS[Number(level)]}
                value={prob}
                highlight={Number(level) === Math.round(p.priority_score ?? -1)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Safety hazard</h3>
        <div className="mt-2">
          <Bar label={hazard >= 0.5 ? 'Likely hazard' : 'Unlikely'} value={hazard} highlight={hazard >= 0.5} />
        </div>
      </div>
    </section>
  )
}
