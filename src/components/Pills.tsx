import type { ReactNode } from 'react'
import {
  DURATIONS, PLACES, PRICES, SEASONS, toggleIn,
  type Category, type Filters,
} from '@/lib/model'

export type PillOpt = { key: string; label: string; on: boolean; pick: () => void }

export function Pill({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className="pill" aria-pressed={on} onClick={onClick}>
      {label}
    </button>
  )
}

export function PillGroup({ title, hint, pills, children }: { title: string; hint?: string; pills: PillOpt[]; children?: ReactNode }) {
  return (
    <fieldset className="group">
      <legend className="kicker">
        {title} {hint && <span className="hint">{hint}</span>}
      </legend>
      <div className="pills">
        {pills.map((o) => (
          <Pill key={o.key} label={o.label} on={o.on} onClick={o.pick} />
        ))}
      </div>
      {children}
    </fieldset>
  )
}

/** Les cinq groupes de filtres multi-valeurs (liste et tirage). */
export function FilterGroups({ value, onChange, cats }: { value: Filters; onChange: (f: Filters) => void; cats: Category[] }) {
  const mk = <K extends keyof Filters>(field: K, opts: readonly { v: Filters[K][number]; label: string }[]): PillOpt[] =>
    opts.map((o) => ({
      key: String(o.v),
      label: o.label,
      on: (value[field] as readonly string[]).includes(o.v),
      pick: () => onChange({ ...value, [field]: toggleIn(value[field] as readonly string[], o.v) }),
    }))
  const groups = [
    { title: 'PRICE', pills: mk('prix', PRICES) },
    { title: 'TIME', pills: mk('duree', DURATIONS) },
    { title: 'SEASON', pills: mk('saisons', SEASONS) },
    { title: 'WHERE', pills: mk('lieu', PLACES) },
    { title: 'CATEGORIES', pills: mk('cats', cats.map((c) => ({ v: c.label, label: c.label }))) },
  ]
  return (
    <>
      {groups.map((g) => (
        <PillGroup key={g.title} title={g.title} pills={g.pills} />
      ))}
    </>
  )
}
