import {
  ALL_YEAR, DURATIONS, LIMITS, PLACES, PRICES, SEASONS, toggleIn,
  type Category, type PlanDraft, type Season,
} from '@/lib/model'
import { PillGroup, type PillOpt } from './Pills'

type Props = {
  draft: PlanDraft
  setDraft: (fn: (d: PlanDraft) => PlanDraft) => void
  cats: Category[]
  newCat: string
  setNewCat: (v: string) => void
  onAddCat: () => void
  onSave: () => void
}

export function IssueScreen({ draft, setDraft, cats, newCat, setNewCat, onAddCat, onSave }: Props) {
  const pickOne = <K extends 'prix' | 'duree' | 'lieu'>(key: K, opts: readonly { v: NonNullable<PlanDraft[K]>; label: string }[]): PillOpt[] =>
    opts.map((o) => ({
      key: o.v,
      label: o.label,
      on: draft[key] === o.v,
      pick: () => setDraft((d) => ({ ...d, [key]: d[key] === o.v ? null : o.v })),
    }))

  const pickSeason = (v: Season) => () =>
    setDraft((d) => {
      const cur = d.saisons
      const next: Season[] =
        v === ALL_YEAR.v
          ? cur.includes(ALL_YEAR.v) ? [] : [ALL_YEAR.v]
          : toggleIn(cur.filter((x) => x !== ALL_YEAR.v), v)
      return { ...d, saisons: next }
    })

  const groups = [
    { title: 'PRICE', hint: '', pills: pickOne('prix', PRICES) },
    { title: 'TIME', hint: '', pills: pickOne('duree', DURATIONS) },
    {
      title: 'VALID IN',
      hint: '(pick several)',
      pills: [ALL_YEAR, ...SEASONS].map((o) => ({ key: o.v, label: o.label, on: draft.saisons.includes(o.v), pick: pickSeason(o.v) })),
    },
    { title: 'WHERE', hint: '', pills: pickOne('lieu', PLACES) },
  ]

  const catPills: PillOpt[] = cats.map((c) => ({
    key: c.id,
    label: c.label,
    on: draft.cats.includes(c.label),
    pick: () =>
      setDraft((d) =>
        d.cats.includes(c.label) || d.cats.length < LIMITS.catsPerPlan ? { ...d, cats: toggleIn(d.cats, c.label) } : d,
      ),
  }))

  const noTitre = !draft.titre.trim()

  return (
    <div className="screen form">
      <header>
        <p className="kicker">ISSUE A TICKET</p>
        <h1 className="h1 h1-form">New plan</h1>
      </header>

      <div className="field">
        <label htmlFor="c-titre" className="kicker">DESTINATION</label>
        <input
          id="c-titre"
          className="title-input"
          type="text"
          value={draft.titre}
          maxLength={LIMITS.title}
          onChange={(e) => {
            const v = e.target.value
            setDraft((d) => ({ ...d, titre: v }))
          }}
          placeholder="e.g. Ferris wheel at sunset"
          autoComplete="off"
        />
      </div>

      {groups.map((g) => (
        <PillGroup key={g.title} title={g.title} hint={g.hint} pills={g.pills} />
      ))}

      <PillGroup title="CATEGORIES" hint="(make your own)" pills={catPills}>
        <form
          className="cat-add"
          onSubmit={(e) => {
            e.preventDefault()
            onAddCat()
          }}
        >
          <label htmlFor="c-cat" className="sr-only">New category</label>
          <input
            id="c-cat"
            className="cat-input"
            type="text"
            value={newCat}
            maxLength={LIMITS.category}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New category…"
            autoComplete="off"
          />
          <button type="submit" className="cat-btn">ADD</button>
        </form>
      </PillGroup>

      <label className="check">
        <input type="checkbox" checked={draft.fait} onChange={() => setDraft((d) => ({ ...d, fait: !d.fait }))} />
        Already punched (we did it)
      </label>

      <button type="button" className="primary" onClick={onSave} disabled={noTitre}>
        Issue ticket
      </button>
    </div>
  )
}
