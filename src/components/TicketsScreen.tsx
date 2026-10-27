import { LogOut, WifiOff } from 'lucide-react'
import { countFilters, emptyFilters, matchFilters, type Category, type Filters, type Plan } from '@/lib/model'
import { FilterGroups, Pill } from './Pills'
import { TicketCard } from './TicketCard'

export type ListTab = 'todo' | 'done' | 'all'
const LIST_TABS: { k: ListTab; label: string }[] = [
  { k: 'todo', label: 'TO DO' },
  { k: 'done', label: 'PUNCHED' },
  { k: 'all', label: 'ALL' },
]

type Props = {
  plans: Plan[]
  cats: Category[]
  loaded: boolean
  listTab: ListTab
  setListTab: (t: ListTab) => void
  showLF: boolean
  setShowLF: (v: boolean) => void
  lf: Filters
  setLF: (f: Filters) => void
  punchingId: string | null
  onPunch: (p: Plan) => void
  online: boolean
  demo: boolean
  onSignOut: (() => void) | null
}

export function TicketsScreen(p: Props) {
  const nbFaits = p.plans.filter((x) => x.fait).length
  const nLF = countFilters(p.lf)
  const visibles = p.plans.filter(
    (x) => (p.listTab === 'all' || (p.listTab === 'done' ? x.fait : !x.fait)) && matchFilters(x, p.lf),
  )

  return (
    <div className="screen">
      <header className="list-head">
        <div className="list-head-row">
          <p className="kicker">
            BOOTH Nº2 · {p.plans.length} TICKETS · {nbFaits} PUNCHED
          </p>
          <div className="head-tools">
            {p.demo && <span className="tag">DEMO</span>}
            {!p.online && (
              <span className="tag" title="Offline">
                <WifiOff size={14} aria-hidden="true" /> OFFLINE
              </span>
            )}
            {p.onSignOut && (
              <button type="button" className="icon-btn" onClick={p.onSignOut} aria-label="Sign out" title="Sign out">
                <LogOut size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <h1 className="h1">
          Our tickets
          <br />
          for later
        </h1>
      </header>

      <div className="pills">
        {LIST_TABS.map((t) => (
          <Pill key={t.k} label={t.label} on={p.listTab === t.k} onClick={() => p.setListTab(t.k)} />
        ))}
        <button
          type="button"
          className="pill"
          aria-pressed={p.showLF || nLF > 0}
          aria-expanded={p.showLF}
          onClick={() => p.setShowLF(!p.showLF)}
        >
          {nLF ? 'FILTERS · ' + nLF : 'FILTER'}
        </button>
      </div>

      {p.showLF && (
        <div className="lf-panel">
          <p className="panel-title">SORT THE TICKETS</p>
          <FilterGroups value={p.lf} onChange={p.setLF} cats={p.cats} />
          <div className="lf-foot">
            <span>{visibles.length + (visibles.length === 1 ? ' ticket' : ' tickets')}</span>
            <button type="button" className="link-btn" onClick={() => p.setLF(emptyFilters())}>
              CLEAR ALL
            </button>
          </div>
        </div>
      )}

      <div className="ticket-list">
        {visibles.map((x) => (
          <TicketCard
            key={x.id}
            plan={x}
            punch={p.punchingId === x.id ? (p.listTab === 'todo' ? 'leave' : 'knock') : null}
            onToggle={() => p.onPunch(x)}
          />
        ))}
        {visibles.length === 0 && <p className="empty">{p.loaded ? 'No tickets match.' : 'Loading tickets…'}</p>}
      </div>
    </div>
  )
}
