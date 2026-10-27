import { durationLabel, placeLabel, priceLabel, seasonsLabel, ticketNum, type Category, type Filters, type Plan } from '@/lib/model'
import { FilterGroups } from './Pills'
import { Stars } from './TicketCard'

export function RaffleFilters(p: {
  f: Filters
  setF: (f: Filters) => void
  cats: Category[]
  inclureFaits: boolean
  setInclureFaits: (v: boolean) => void
  nb: number
  onDraw: () => void
  onReset: () => void
}) {
  return (
    <div className="screen form">
      <header>
        <p className="kicker">THE GREAT COUPLE’S RAFFLE</p>
        <h1 className="h1 h1-form">Your picks</h1>
        <p className="lead">Nothing picked = anything goes.</p>
      </header>
      <FilterGroups value={p.f} onChange={p.setF} cats={p.cats} />
      <label className="check">
        <input type="checkbox" checked={p.inclureFaits} onChange={() => p.setInclureFaits(!p.inclureFaits)} />
        Include punched tickets
      </label>
      <button type="button" className="primary" onClick={p.onDraw} disabled={p.nb === 0}>
        {p.nb === 0 ? 'No ticket in play' : `Draw a ticket (${p.nb})`}
      </button>
      <button type="button" className="link-btn" onClick={p.onReset}>
        RESET
      </button>
    </div>
  )
}

export function Drawing({ title, num }: { title: string; num: number }) {
  return (
    <div className="drawing" aria-live="polite">
      <p className="kicker wide">DRAW IN PROGRESS</p>
      <p className="draw-num">Nº {num}</p>
      <div className="machine-wrap">
        <div className="draw-ticket">
          <span className="ticket-num">
            ADMIT TWO <Stars />
          </span>
          <p className="draw-title">{title}</p>
          <div className="barcode" aria-hidden="true" />
        </div>
        <div className="machine">
          <div className="slot" aria-hidden="true" />
          <span className="machine-label">RAFFLE</span>
          <div className="lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  )
}

export function Result(p: {
  plan: Plan | null
  nb: number
  onBack: () => void
  onToggleDone: () => void
  onAgain: () => void
}) {
  const r = p.plan
  const rows = r
    ? [
        { k: 'PRICE', v: priceLabel(r.prix) ?? '—' },
        { k: 'TIME', v: durationLabel(r.duree) ?? '—' },
        { k: 'VALID', v: seasonsLabel(r.saisons) || '—' },
        { k: 'WHERE', v: placeLabel(r.lieu) ?? '—' },
      ]
    : []
  return (
    <div className="result">
      <button type="button" className="back-btn" onClick={p.onBack}>
        ← YOUR PICKS
      </button>
      <div className="result-head">
        <p className="kicker">THE GREAT COUPLE’S RAFFLE</p>
        <p className="win">Winning ticket</p>
      </div>
      {r ? (
        <>
          <article className="win-ticket">
            <div className="win-body">
              <p className="ticket-num">
                DESTINATION <Stars />
              </p>
              <h1 className="win-title">{r.titre}</h1>
              <div className="win-rows">
                {rows.map((x) => (
                  <div key={x.k} className="win-row">
                    <span className="win-k">{x.k}</span>
                    <span className="win-v">{x.v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="win-foot">
              <div className="barcode tall" aria-hidden="true" />
              <span className="win-num">{ticketNum(r.num)}</span>
            </div>
            {r.fait && <span className="stamp big">PUNCHED</span>}
            <div className="win-notch left" aria-hidden="true" />
            <div className="win-notch right" aria-hidden="true" />
          </article>
          <p className="pool-line">
            {p.nb > 1 ? `Drawn from ${p.nb} tickets in play.` : p.nb === 1 ? 'The only ticket in play.' : ''}
          </p>
          <button type="button" className={'primary ' + (r.fait ? 'done-on' : 'done-off')} onClick={p.onToggleDone}>
            {r.fait ? 'Punched ✓ — undo' : 'Punch the ticket'}
          </button>
          <button type="button" className="primary again" onClick={p.onAgain}>
            Draw another ticket
          </button>
        </>
      ) : (
        <p className="no-result">No ticket matches. Remove a pick.</p>
      )}
    </div>
  )
}
