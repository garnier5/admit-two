// Deux implémentations d'une même interface :
// - remote : tables admit_* du projet Supabase (RLS, temps réel) ;
// - local  : données de démo dans ce navigateur (mode `dev:offline`, aucune requête réseau).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, Plan, PlanDraft } from './model'
import { parseCategory, parseList, parsePlan } from './validate'
import { readJSON, writeJSON } from './storage'
import { seedCategories, seedPlans } from './seed'

export type Change =
  | { kind: 'plan'; id: string; plan: Plan | null } // null : supprimé ou invalide → retiré
  | { kind: 'category'; id: string; cat: Category | null }
  | { kind: 'reload' }

export type Snapshot = { plans: Plan[]; cats: Category[] }

export interface Backend {
  mode: 'remote' | 'local'
  load(): Promise<Snapshot>
  insertPlan(id: string, d: PlanDraft): Promise<Plan>
  setFait(id: string, fait: boolean): Promise<void>
  /** null : une catégorie du même nom existe déjà (il faut recharger). */
  insertCategory(id: string, label: string): Promise<Category | null>
  subscribe(onChange: (c: Change) => void): () => void
}

const PLAN_COLS = 'id, num, titre, prix, duree, saisons, lieu, cats, fait, deleted, created_at'
const CAT_COLS = 'id, label, deleted'

const rowId = (r: unknown): string | null =>
  typeof r === 'object' && r !== null && typeof (r as { id?: unknown }).id === 'string' ? (r as { id: string }).id : null

export function remoteBackend(sb: SupabaseClient): Backend {
  return {
    mode: 'remote',

    async load() {
      const [p, c] = await Promise.all([
        sb.from('admit_plans').select(PLAN_COLS).eq('deleted', false).order('created_at', { ascending: false }).limit(2000),
        sb.from('admit_categories').select(CAT_COLS).eq('deleted', false).order('created_at').order('label').limit(500),
      ])
      if (p.error) throw p.error
      if (c.error) throw c.error
      return { plans: parseList(p.data, parsePlan), cats: parseList(c.data, parseCategory) }
    },

    async insertPlan(id, d) {
      const { data, error } = await sb
        .from('admit_plans')
        .insert({ id, titre: d.titre, prix: d.prix, duree: d.duree, saisons: d.saisons, lieu: d.lieu, cats: d.cats, fait: d.fait })
        .select(PLAN_COLS)
        .single()
      if (error) throw error
      const plan = parsePlan(data)
      if (!plan) throw new Error('Server returned an invalid ticket')
      return plan
    },

    async setFait(id, fait) {
      const { data, error } = await sb.from('admit_plans').update({ fait }).eq('id', id).select('id')
      if (error) throw error
      if (!Array.isArray(data) || data.length === 0) throw new Error('Ticket not found or not allowed')
    },

    async insertCategory(id, label) {
      const { data, error } = await sb.from('admit_categories').insert({ id, label }).select(CAT_COLS).single()
      if (error) {
        if (error.code === '23505') return null // déjà créée (par l'autre personne, par ex.)
        throw error
      }
      const cat = parseCategory(data)
      if (!cat) throw new Error('Server returned an invalid category')
      return cat
    },

    subscribe(onChange) {
      const channel = sb
        .channel('admit-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admit_plans' }, (payload) => {
          const id = rowId(payload.new) ?? rowId(payload.old)
          if (id) onChange({ kind: 'plan', id, plan: parsePlan(payload.new) })
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admit_categories' }, (payload) => {
          const id = rowId(payload.new) ?? rowId(payload.old)
          if (id) onChange({ kind: 'category', id, cat: parseCategory(payload.new) })
        })
        .subscribe((status) => {
          // (Re)connecté : on recharge pour rattraper les événements manqués.
          if (status === 'SUBSCRIBED') onChange({ kind: 'reload' })
        })

      const refresh = () => {
        if (document.visibilityState === 'visible') onChange({ kind: 'reload' })
      }
      window.addEventListener('online', refresh)
      document.addEventListener('visibilitychange', refresh)
      return () => {
        window.removeEventListener('online', refresh)
        document.removeEventListener('visibilitychange', refresh)
        void sb.removeChannel(channel)
      }
    },
  }
}

const DEMO_KEY = 'demo'

function readDemo(): Snapshot {
  const raw = readJSON(DEMO_KEY) as { plans?: unknown; cats?: unknown } | null
  if (raw && typeof raw === 'object') {
    return { plans: parseList(raw.plans, parsePlan), cats: parseList(raw.cats, parseCategory) }
  }
  const seeded = { plans: seedPlans(), cats: seedCategories() }
  writeJSON(DEMO_KEY, seeded)
  return seeded
}

export function localBackend(): Backend {
  const save = (s: Snapshot) => writeJSON(DEMO_KEY, s)
  return {
    mode: 'local',

    async load() {
      return readDemo()
    },

    async insertPlan(id, d) {
      const s = readDemo()
      const num = s.plans.reduce((m, p) => Math.max(m, p.num ?? 0), 0) + 1
      const plan: Plan = { ...d, id, num, createdAt: new Date().toISOString() }
      save({ ...s, plans: [plan, ...s.plans] })
      return plan
    },

    async setFait(id, fait) {
      const s = readDemo()
      save({ ...s, plans: s.plans.map((p) => (p.id === id ? { ...p, fait } : p)) })
    },

    async insertCategory(id, label) {
      const s = readDemo()
      if (s.cats.some((c) => c.label.toLowerCase() === label.toLowerCase())) return null
      const cat = { id, label }
      save({ ...s, cats: [...s.cats, cat] })
      return cat
    },

    subscribe(onChange) {
      // Synchronisation entre onglets du même navigateur.
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key.endsWith(DEMO_KEY)) onChange({ kind: 'reload' })
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    },
  }
}
