// Valeurs stockées en base (codes stables) et leurs libellés affichés.
// Les mêmes listes et limites sont imposées côté SQL (supabase/001_admit_init.sql).

export const LIMITS = {
  title: 80,
  category: 30,
  catsPerPlan: 20,
} as const

export const PRICES = [
  { v: 'free', label: 'Free' },
  { v: '1', label: '€' },
  { v: '2', label: '€€' },
  { v: '3', label: '€€€' },
] as const

export const DURATIONS = [
  { v: 'lt1h', label: '< 1 h' },
  { v: '1to3h', label: '1–3 h' },
  { v: 'half', label: 'Half day' },
  { v: 'full', label: 'Full day' },
  { v: 'weekend', label: 'Weekend' },
] as const

export const ALL_YEAR = { v: 'all', label: 'All year' } as const

export const SEASONS = [
  { v: 'spring', label: 'Spring' },
  { v: 'summer', label: 'Summer' },
  { v: 'autumn', label: 'Autumn' },
  { v: 'winter', label: 'Winter' },
] as const

export const PLACES = [
  { v: 'home', label: 'At home' },
  { v: 'town', label: 'In town' },
  { v: 'nearby', label: 'Nearby' },
  { v: 'trip', label: 'Trip' },
] as const

export type Price = (typeof PRICES)[number]['v']
export type Duration = (typeof DURATIONS)[number]['v']
export type Season = (typeof SEASONS)[number]['v'] | typeof ALL_YEAR.v
export type Place = (typeof PLACES)[number]['v']

export type Plan = {
  id: string
  num: number | null
  titre: string
  prix: Price | null
  duree: Duration | null
  saisons: Season[]
  lieu: Place | null
  cats: string[]
  fait: boolean
  createdAt: string
}

export type Category = { id: string; label: string }

export type PlanDraft = Omit<Plan, 'id' | 'num' | 'createdAt'>

// Filtres multi-valeurs (liste et tirage). Rien de coché = tout passe.
export type Filters = {
  prix: Price[]
  duree: Duration[]
  saisons: Season[]
  lieu: Place[]
  cats: string[]
}

export const emptyFilters = (): Filters => ({ prix: [], duree: [], saisons: [], lieu: [], cats: [] })

export const emptyDraft = (): PlanDraft => ({
  titre: '', prix: null, duree: null, saisons: [], lieu: null, cats: [], fait: false,
})

export const countFilters = (f: Filters) =>
  f.prix.length + f.duree.length + f.saisons.length + f.lieu.length + f.cats.length

export function toggleIn<T>(arr: readonly T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]
}

function inOrAny<T>(arr: readonly T[], v: T | null) {
  return arr.length === 0 || (v !== null && arr.includes(v))
}

export function matchFilters(p: Plan, f: Filters): boolean {
  if (!inOrAny(f.prix, p.prix) || !inOrAny(f.duree, p.duree) || !inOrAny(f.lieu, p.lieu)) return false
  if (f.saisons.length && !p.saisons.includes(ALL_YEAR.v) && !p.saisons.some((x) => f.saisons.includes(x))) return false
  if (f.cats.length && !p.cats.some((c) => f.cats.includes(c))) return false
  return true
}

function labelOf(list: readonly { v: string; label: string }[], v: string | null) {
  return list.find((o) => o.v === v)?.label ?? null
}

export const priceLabel = (v: Price | null) => labelOf(PRICES, v)
export const durationLabel = (v: Duration | null) => labelOf(DURATIONS, v)
export const placeLabel = (v: Place | null) => labelOf(PLACES, v)

const SEASON_LIST = [ALL_YEAR, ...SEASONS]
export const seasonsLabel = (arr: Season[]) =>
  SEASON_LIST.filter((s) => arr.includes(s.v)).map((s) => s.label).join(', ')

export const ticketNum = (n: number | null) =>
  'Nº' + (n === null ? '····' : String(n).slice(-4).padStart(4, '0'))

/** Le plus récent en premier, comme le standalone. */
export const sortPlans = (plans: Plan[]) =>
  [...plans].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))

/** Nettoie une étiquette saisie, comme l'exige le check SQL (pas d'espaces en bord). */
export const cleanLabel = (s: string) => s.replace(/\s+/g, ' ').trim()
