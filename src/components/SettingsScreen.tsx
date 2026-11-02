import { useState } from 'react'
import { LogOut, Pencil, Trash2 } from 'lucide-react'
import { cleanLabel, findCategory, LIMITS, type Category, type Plan } from '@/lib/model'

type Props = {
  cats: Category[]
  plans: Plan[]
  loaded: boolean
  demo: boolean
  onAdd: (label: string) => void
  onRename: (id: string, label: string) => void
  onDelete: (id: string) => void
  onSignOut: (() => void) | null
}

type Edit = { id: string; mode: 'rename'; value: string } | { id: string; mode: 'delete' }

const ticketsWord = (n: number) => n + (n === 1 ? ' ticket' : ' tickets')

export function SettingsScreen(p: Props) {
  const [edit, setEdit] = useState<Edit | null>(null)
  const [newCat, setNewCat] = useState('')

  const uses = (c: Category) => {
    const l = c.label.toLowerCase()
    return p.plans.filter((x) => x.cats.some((y) => y.toLowerCase() === l)).length
  }

  const add = () => {
    const name = cleanLabel(newCat).slice(0, LIMITS.category).trim()
    if (!name) return
    if (!findCategory(p.cats, name)) p.onAdd(name)
    setNewCat('')
  }

  const row = (c: Category) => {
    const n = uses(c)

    if (edit?.id === c.id && edit.mode === 'rename') {
      const name = cleanLabel(edit.value).slice(0, LIMITS.category).trim()
      const target = name ? findCategory(p.cats, name, c.id) : null
      const unchanged = name === c.label
      const save = () => {
        if (!name || unchanged) return setEdit(null)
        p.onRename(c.id, name)
        setEdit(null)
      }
      return (
        <li key={c.id} className="cat-row editing">
          <form
            className="cat-edit"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
            onKeyDown={(e) => e.key === 'Escape' && setEdit(null)}
          >
            <label htmlFor={'rn-' + c.id} className="sr-only">
              New name for {c.label}
            </label>
            <input
              id={'rn-' + c.id}
              className="cat-input solid"
              type="text"
              value={edit.value}
              maxLength={LIMITS.category}
              onChange={(e) => setEdit({ ...edit, value: e.target.value })}
              autoFocus
              autoComplete="off"
            />
            <div className="cat-actions">
              <button type="submit" className="cat-btn on" disabled={!name}>
                {target ? 'MERGE' : 'SAVE'}
              </button>
              <button type="button" className="cat-btn" onClick={() => setEdit(null)}>
                CANCEL
              </button>
            </div>
          </form>
          {target && (
            <p className="cat-note">
              “{target.label}” already exists: {ticketsWord(n)} will move to it and “{c.label}” will disappear.
            </p>
          )}
        </li>
      )
    }

    if (edit?.id === c.id && edit.mode === 'delete') {
      return (
        <li key={c.id} className="cat-row editing">
          <p className="cat-note strong">
            Delete “{c.label}”?{' '}
            {n ? `It will be removed from ${ticketsWord(n)}; the tickets stay.` : 'No ticket uses it.'}
          </p>
          <div className="cat-actions">
            <button
              type="button"
              className="cat-btn danger"
              onClick={() => {
                p.onDelete(c.id)
                setEdit(null)
              }}
            >
              DELETE
            </button>
            <button type="button" className="cat-btn" onClick={() => setEdit(null)} autoFocus>
              KEEP
            </button>
          </div>
        </li>
      )
    }

    return (
      <li key={c.id} className="cat-row">
        <div className="cat-info">
          <span className="cat-name">{c.label}</span>
          <span className="cat-count">{n ? ticketsWord(n) : 'unused'}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setEdit({ id: c.id, mode: 'rename', value: c.label })}
          aria-label={'Rename ' + c.label}
          title="Rename"
        >
          <Pencil size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setEdit({ id: c.id, mode: 'delete' })}
          aria-label={'Delete ' + c.label}
          title="Delete"
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </li>
    )
  }

  return (
    <div className="screen form">
      <header>
        <p className="kicker">BACKSTAGE</p>
        <h1 className="h1 h1-form">Settings</h1>
      </header>

      <section className="group" aria-labelledby="set-cats">
        <h2 id="set-cats" className="kicker section-title">
          CATEGORIES <span className="hint">(shared by both of you)</span>
        </h2>
        {p.cats.length > 0 ? (
          <ul className="cat-list">{p.cats.map(row)}</ul>
        ) : (
          <p className="empty">{p.loaded ? 'No categories yet.' : 'Loading…'}</p>
        )}
        <form
          className="cat-add"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <label htmlFor="s-cat" className="sr-only">New category</label>
          <input
            id="s-cat"
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
      </section>

      <section className="group" aria-labelledby="set-account">
        <h2 id="set-account" className="kicker section-title">
          {p.demo ? 'DEMO' : 'ACCOUNT'}
        </h2>
        {p.demo && <p className="lead">Demo data stays in this browser only.</p>}
        {p.onSignOut && (
          <button type="button" className="primary again" onClick={p.onSignOut}>
            <LogOut size={20} aria-hidden="true" /> Sign out
          </button>
        )}
      </section>
    </div>
  )
}
