import { durationLabel, placeLabel, priceLabel, seasonsLabel, ticketNum, type Plan } from '@/lib/model'

export type Punch = 'leave' | 'knock' | null

export function Stars() {
  return <span className="stars" aria-hidden="true">★★★</span>
}

export function TicketCard({ plan, punch, onToggle, onEdit }: { plan: Plan; punch: Punch; onToggle: () => void; onEdit: (() => void) | null }) {
  const showMark = plan.fait || punch !== null
  const meta = [durationLabel(plan.duree), placeLabel(plan.lieu)].filter(Boolean).join(' · ') || '—'
  const stub = (plan.num ?? 0) % 3
  return (
    <article className={'ticket' + (punch ? ' punch-' + punch : '')}>
      <div className="ticket-body">
        <p className="ticket-num">
          {ticketNum(plan.num)} · ADMIT TWO <Stars />
        </p>
        <h2 className="ticket-title">
          {onEdit ? (
            // Toute la partie gauche du ticket est cliquable (::after), le talon reste le bouton de poinçonnage.
            <button type="button" className="ticket-open" onClick={onEdit}>
              <span className="sr-only">Edit </span>
              {plan.titre}
            </button>
          ) : (
            plan.titre
          )}
        </h2>
        <p className="ticket-meta">{meta}</p>
        <p className="ticket-sub">
          {seasonsLabel(plan.saisons) || 'Any season'} · {plan.cats.join(', ') || 'No category'}
        </p>
        {showMark && <span className="stamp">PUNCHED</span>}
      </div>
      <button
        type="button"
        className={'stub stub-' + stub}
        onClick={onToggle}
        aria-pressed={plan.fait}
        aria-label={plan.fait ? `Un-punch “${plan.titre}”` : `Punch “${plan.titre}” (mark as done)`}
      >
        <span className="stub-price">{priceLabel(plan.prix) ?? '—'}</span>
        {showMark && <span className="hole" aria-hidden="true" />}
      </button>
      <div className="notch notch-top" aria-hidden="true" />
      <div className="notch notch-bottom" aria-hidden="true" />
    </article>
  )
}
