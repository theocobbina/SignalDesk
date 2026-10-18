/**
 * Small hand-rolled charts for the dashboard.
 * Specs: bars ≤24px thick with 4px rounded data-ends, hairline solid gridlines,
 * text in ink tokens (never the series color), value labels at bar tips,
 * hover tooltips, and a visually hidden table for screen readers.
 */
import { useState } from 'react'
import { SERIES } from '../lib/chartColors'

const INK_MUTED = '#898781'
const GRID = '#e1e0d9'
const BASELINE = '#c3c2b7'

export function StatTile({ label, value, hint, alert }: { label: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">
        {alert && <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-red-600 align-middle" />}
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function SrTable({ caption, rows }: { caption: string; rows: [string, string | number][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export type BarDatum = { label: string; value: number; detail?: string; color?: string }

/** Horizontal bars with the value at the tip. */
export function BarList({ data, caption }: { data: BarDatum[]; caption: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div>
      <ul className="space-y-2">
        {data.map((d) => (
          <li key={d.label} className="group flex items-center gap-3 text-sm" title={d.detail}>
            <span className="w-40 shrink-0 truncate text-gray-700" title={d.label}>{d.label}</span>
            <div className="flex h-5 flex-1 items-center gap-2">
              {d.value > 0 && (
                <div
                  className="h-4 rounded-r transition-opacity group-hover:opacity-80"
                  style={{ width: `${(d.value / max) * 85}%`, background: d.color ?? SERIES }}
                />
              )}
              <span className="text-gray-900 tabular-nums">{d.value}</span>
            </div>
          </li>
        ))}
      </ul>
      <SrTable caption={caption} rows={data.map((d) => [d.label, d.value])} />
    </div>
  )
}

function niceMax(n: number) {
  if (n <= 4) return 4
  const step = 10 ** Math.floor(Math.log10(n))
  return Math.ceil(n / step) * step
}

/** Daily volume: columns on a single baseline, hover shows the exact day and count. */
export function DailyColumns({ data, caption }: { data: { date: string; count: number }[]; caption: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = 180
  const pad = { top: 12, right: 8, bottom: 22, left: 28 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const max = niceMax(Math.max(...data.map((d) => d.count)))
  const ticks = [0, max / 2, max]
  const slot = innerW / data.length
  const barW = Math.min(24, Math.max(2, slot - 2)) // ≥2px surface gap between columns
  const y = (v: number) => pad.top + innerH - (v / max) * innerH
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const labelEvery = Math.ceil(data.length / 6)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={caption} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASELINE : GRID} strokeWidth={1} />
            <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={INK_MUTED}>
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * slot + (slot - barW) / 2
          const h = (d.count / max) * innerH
          const r = Math.min(4, barW / 2, h)
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              {/* Hit target: the whole slot, taller than the mark. */}
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${barW - 2 * r} q${r},0 ${r},${r} v${h - r} z`}
                  fill={SERIES}
                  opacity={hover === null || hover === i ? 1 : 0.5}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={10} fill={INK_MUTED}>
                  {fmt(d.date)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md border bg-white px-2 py-1 text-xs whitespace-nowrap shadow"
          style={{ left: `${((pad.left + (hover + 0.5) * slot) / W) * 100}%` }}
        >
          <span className="text-gray-500">{fmt(data[hover].date)}</span>{' '}
          <span className="font-semibold text-gray-900">{data[hover].count} reports</span>
        </div>
      )}
      <SrTable caption={caption} rows={data.map((d) => [d.date, d.count])} />
    </div>
  )
}
