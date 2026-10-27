// État partagé des tickets et catégories : cache local, écritures optimistes, temps réel.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Backend, Snapshot } from '@/lib/backend'
import { sortPlans, type Category, type Plan, type PlanDraft } from '@/lib/model'
import { readJSON, writeJSON } from '@/lib/storage'
import { parseCategory, parseList, parsePlan } from '@/lib/validate'

function readCache(key: string | null): Snapshot | null {
  if (!key) return null
  const raw = readJSON(key) as { plans?: unknown; cats?: unknown } | null
  if (!raw || typeof raw !== 'object') return null
  return { plans: parseList(raw.plans, parsePlan), cats: parseList(raw.cats, parseCategory) }
}

const errMsg = (what: string) =>
  navigator.onLine ? `Couldn’t ${what}. Please try again.` : `You’re offline — couldn’t ${what}.`

export function useData(backend: Backend, cacheKey: string | null) {
  const [snap, setSnap] = useState<Snapshot | null>(() => readCache(cacheKey))
  const [error, setError] = useState<string | null>(null)

  // Écritures en cours, réappliquées par-dessus chaque rechargement.
  const pendingPlans = useRef(new Map<string, Plan>())
  const pendingFait = useRef(new Map<string, boolean>())
  const pendingCats = useRef(new Map<string, Category>())

  const overlay = useCallback((s: Snapshot): Snapshot => {
    const ids = new Set(s.plans.map((p) => p.id))
    const plans = [...[...pendingPlans.current.values()].filter((p) => !ids.has(p.id)), ...s.plans].map((p) =>
      pendingFait.current.has(p.id) ? { ...p, fait: pendingFait.current.get(p.id)! } : p,
    )
    const catIds = new Set(s.cats.map((c) => c.id))
    const cats = [...s.cats, ...[...pendingCats.current.values()].filter((c) => !catIds.has(c.id))]
    return { plans: sortPlans(plans), cats }
  }, [])

  const reload = useCallback(async () => {
    try {
      setSnap(overlay(await backend.load()))
    } catch (e) {
      console.warn('[admit] load failed', e)
      setSnap((s) => s ?? { plans: [], cats: [] })
      setError(errMsg('load the tickets'))
    }
  }, [backend, overlay])

  useEffect(() => {
    void reload()
    return backend.subscribe((c) => {
      if (c.kind === 'reload') return void reload()
      setSnap((s) => {
        if (!s) return s
        if (c.kind === 'plan') {
          const rest = s.plans.filter((p) => p.id !== c.id)
          return overlay({ ...s, plans: c.plan ? [c.plan, ...rest] : rest })
        }
        const exists = s.cats.some((x) => x.id === c.id)
        const cats = c.cat
          ? exists ? s.cats.map((x) => (x.id === c.id ? c.cat! : x)) : [...s.cats, c.cat]
          : s.cats.filter((x) => x.id !== c.id)
        return overlay({ ...s, cats })
      })
    })
  }, [backend, reload, overlay])

  useEffect(() => {
    if (cacheKey && snap) writeJSON(cacheKey, snap)
  }, [cacheKey, snap])

  const addPlan = useCallback(
    async (d: PlanDraft) => {
      const id = crypto.randomUUID()
      const temp: Plan = { ...d, id, num: null, createdAt: new Date().toISOString() }
      pendingPlans.current.set(id, temp)
      setSnap((s) => overlay(s ?? { plans: [], cats: [] }))
      try {
        const saved = await backend.insertPlan(id, d)
        pendingPlans.current.delete(id)
        setSnap((s) => s && overlay({ ...s, plans: [saved, ...s.plans.filter((p) => p.id !== id)] }))
      } catch (e) {
        console.warn('[admit] insert failed', e)
        pendingPlans.current.delete(id)
        setSnap((s) => s && overlay({ ...s, plans: s.plans.filter((p) => p.id !== id) }))
        setError(errMsg('save the ticket'))
      }
    },
    [backend, overlay],
  )

  const setFait = useCallback(
    async (id: string, fait: boolean) => {
      const before = snap?.plans.find((p) => p.id === id)?.fait
      pendingFait.current.set(id, fait)
      setSnap((s) => s && overlay(s))
      try {
        await backend.setFait(id, fait)
        pendingFait.current.delete(id)
        setSnap((s) => s && overlay({ ...s, plans: s.plans.map((p) => (p.id === id ? { ...p, fait } : p)) }))
      } catch (e) {
        console.warn('[admit] update failed', e)
        pendingFait.current.delete(id)
        if (before !== undefined) {
          setSnap((s) => s && overlay({ ...s, plans: s.plans.map((p) => (p.id === id ? { ...p, fait: before } : p)) }))
        }
        setError(errMsg('punch the ticket'))
      }
    },
    [backend, overlay, snap],
  )

  const addCategory = useCallback(
    async (label: string) => {
      const id = crypto.randomUUID()
      pendingCats.current.set(id, { id, label })
      setSnap((s) => s && overlay(s))
      try {
        const saved = await backend.insertCategory(id, label)
        pendingCats.current.delete(id)
        if (saved) setSnap((s) => s && overlay({ ...s, cats: [...s.cats.filter((c) => c.id !== id), saved] }))
        else await reload()
      } catch (e) {
        console.warn('[admit] category insert failed', e)
        pendingCats.current.delete(id)
        setSnap((s) => s && overlay({ ...s, cats: s.cats.filter((c) => c.id !== id) }))
        setError(errMsg('add the category'))
      }
    },
    [backend, overlay, reload],
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    plans: snap?.plans ?? [],
    cats: snap?.cats ?? [],
    loaded: snap !== null,
    error,
    clearError,
    addPlan,
    setFait,
    addCategory,
  }
}
