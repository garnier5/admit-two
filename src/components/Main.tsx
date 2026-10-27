import { useEffect, useRef, useState } from 'react'
import type { Backend } from '@/lib/backend'
import { cleanLabel, emptyDraft, emptyFilters, LIMITS, matchFilters, type Filters, type Plan, type PlanDraft } from '@/lib/model'
import { useData } from '@/hooks/useData'
import { useHashTab, type Tab } from '@/hooks/useHashTab'
import { TicketsScreen, type ListTab } from './TicketsScreen'
import { IssueScreen } from './IssueScreen'
import { Drawing, RaffleFilters, Result } from './RaffleScreens'

type RaffleScreen = 'filters' | 'drawing' | 'result'

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function Main({ backend, cacheKey, onSignOut }: { backend: Backend; cacheKey: string | null; onSignOut: (() => void) | null }) {
  const data = useData(backend, cacheKey)
  const { plans, cats } = data
  const online = useOnline()
  const [tab, setTab] = useHashTab()

  // Liste
  const [listTab, setListTab] = useState<ListTab>('todo')
  const [showLF, setShowLF] = useState(false)
  const [lf, setLF] = useState<Filters>(emptyFilters)
  const [punchingId, setPunchingId] = useState<string | null>(null)
  const punchTimer = useRef<number | null>(null)

  // Formulaire
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft)
  const [newCat, setNewCat] = useState('')

  // Tirage
  const [raffle, setRaffle] = useState<RaffleScreen>('filters')
  const [f, setF] = useState<Filters>(emptyFilters)
  const [inclureFaits, setInclureFaits] = useState(false)
  const [tirageId, setTirageId] = useState<string | null>(null)
  const [draw, setDraw] = useState({ title: '', num: 1000 })
  const drawTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (drawTimer.current !== null) clearInterval(drawTimer.current)
      if (punchTimer.current !== null) clearTimeout(punchTimer.current)
    },
    [],
  )

  const { error, clearError } = data
  useEffect(() => {
    if (!error) return
    const t = window.setTimeout(clearError, 5000)
    return () => clearTimeout(t)
  }, [error, clearError])

  const pool = plans.filter((p) => matchFilters(p, f) && (inclureFaits || !p.fait))
  const result = plans.find((p) => p.id === tirageId) ?? null

  const go = (t: Tab) => {
    if (t === 'raffle') setRaffle((r) => (r === 'drawing' ? r : 'filters'))
    setTab(t)
  }

  const punch = (p: Plan) => {
    if (p.fait) return void data.setFait(p.id, false)
    if (punchTimer.current !== null) return
    setPunchingId(p.id)
    const delay = listTab === 'todo' ? 1100 : 650
    punchTimer.current = window.setTimeout(() => {
      punchTimer.current = null
      void data.setFait(p.id, true)
      setPunchingId(null)
    }, delay)
  }

  const addCat = () => {
    const name = cleanLabel(newCat).slice(0, LIMITS.category).trim()
    if (!name) return
    const found = cats.find((c) => c.label.toLowerCase() === name.toLowerCase())
    const label = found ? found.label : name
    if (!found) void data.addCategory(name)
    setDraft((d) =>
      d.cats.includes(label) || d.cats.length >= LIMITS.catsPerPlan ? d : { ...d, cats: [...d.cats, label] },
    )
    setNewCat('')
  }

  const savePlan = () => {
    const titre = cleanLabel(draft.titre).slice(0, LIMITS.title).trim()
    if (!titre) return
    // Ne garder que des catégories encore connues (l'autre personne a pu en changer).
    const known = new Set(cats.map((c) => c.label))
    void data.addPlan({ ...draft, titre, cats: draft.cats.filter((c) => known.has(c)) })
    setDraft(emptyDraft())
    setNewCat('')
    setListTab(draft.fait ? 'done' : 'todo')
    setTab('tickets')
  }

  const tirer = () => {
    if (drawTimer.current !== null) return
    if (!pool.length) {
      setTirageId(null)
      setRaffle('result')
      return
    }
    const choices = pool.length > 1 ? pool.filter((p) => p.id !== tirageId) : pool
    const pick = choices[Math.floor(Math.random() * choices.length)]
    const titles = pool.map((p) => p.titre)
    let n = 0
    setDraw({ title: titles[0], num: 1000 })
    setRaffle('drawing')
    drawTimer.current = window.setInterval(() => {
      n++
      setDraw({ title: titles[Math.floor(Math.random() * titles.length)], num: Math.floor(Math.random() * 9000) + 1000 })
      if (n >= 18) {
        clearInterval(drawTimer.current!)
        drawTimer.current = null
        setTirageId(pick.id)
        setRaffle('result')
      }
    }, 95)
  }

  let screen
  if (tab === 'tickets') {
    screen = (
      <TicketsScreen
        plans={plans}
        cats={cats}
        loaded={data.loaded}
        listTab={listTab}
        setListTab={setListTab}
        showLF={showLF}
        setShowLF={setShowLF}
        lf={lf}
        setLF={setLF}
        punchingId={punchingId}
        onPunch={punch}
        online={online}
        demo={backend.mode === 'local'}
        onSignOut={onSignOut}
      />
    )
  } else if (tab === 'issue') {
    screen = (
      <IssueScreen
        draft={draft}
        setDraft={setDraft}
        cats={cats}
        newCat={newCat}
        setNewCat={setNewCat}
        onAddCat={addCat}
        onSave={savePlan}
      />
    )
  } else if (raffle === 'drawing') {
    screen = <Drawing title={draw.title} num={draw.num} />
  } else if (raffle === 'result') {
    screen = (
      <Result
        plan={result}
        nb={pool.length}
        onBack={() => setRaffle('filters')}
        onToggleDone={() => result && void data.setFait(result.id, !result.fait)}
        onAgain={tirer}
      />
    )
  } else {
    screen = (
      <RaffleFilters
        f={f}
        setF={setF}
        cats={cats}
        inclureFaits={inclureFaits}
        setInclureFaits={setInclureFaits}
        nb={pool.length}
        onDraw={tirer}
        onReset={() => {
          setF(emptyFilters())
          setInclureFaits(false)
        }}
      />
    )
  }

  return (
    <div className="app">
      <main className="scroll" key={tab}>
        {screen}
      </main>
      {data.error && (
        <div className="toast" role="alert">
          <span>{data.error}</span>
          <button type="button" className="link-btn small" onClick={data.clearError}>
            OK
          </button>
        </div>
      )}
      <nav className="nav" aria-label="Main navigation">
        <button type="button" className={tab === 'tickets' ? 'on' : ''} aria-current={tab === 'tickets' ? 'page' : undefined} onClick={() => go('tickets')}>
          TICKETS
        </button>
        <button type="button" className={tab === 'issue' ? 'on' : ''} aria-current={tab === 'issue' ? 'page' : undefined} onClick={() => go('issue')}>
          + ISSUE
        </button>
        <button type="button" className={tab === 'raffle' ? 'on' : ''} aria-current={tab === 'raffle' ? 'page' : undefined} onClick={() => go('raffle')}>
          RAFFLE
        </button>
      </nav>
    </div>
  )
}
