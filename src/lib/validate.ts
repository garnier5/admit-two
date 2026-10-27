// Validation de tout ce qui vient du serveur (ou du stockage local) avant usage.
// Une ligne malformée est ignorée, jamais propagée à l'interface.
import {
  ALL_YEAR, DURATIONS, LIMITS, PLACES, PRICES, SEASONS,
  type Category, type Duration, type Place, type Plan, type Price, type Season,
} from './model'

const PRICE_SET = new Set<string>(PRICES.map((o) => o.v))
const DURATION_SET = new Set<string>(DURATIONS.map((o) => o.v))
const PLACE_SET = new Set<string>(PLACES.map((o) => o.v))
const SEASON_SET = new Set<string>([ALL_YEAR.v, ...SEASONS.map((o) => o.v)])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x)

export const isLabel = (x: unknown, max: number): x is string =>
  typeof x === 'string' && x.length > 0 && x.length <= max && x === x.trim()

/** null si absent, undefined si invalide. */
function enumOrNull<T extends string>(x: unknown, set: Set<string>): T | null | undefined {
  if (x === null || x === undefined) return null
  return typeof x === 'string' && set.has(x) ? (x as T) : undefined
}

function labels(x: unknown, max: number, maxItems: number, allowed?: Set<string>): string[] | null {
  if (x === null || x === undefined) return []
  if (!Array.isArray(x) || x.length > maxItems) return null
  const out: string[] = []
  for (const v of x) {
    if (!isLabel(v, max) || (allowed && !allowed.has(v))) return null
    if (!out.includes(v)) out.push(v)
  }
  return out
}

function isoDate(x: unknown): string | null {
  return typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? x : null
}

/** Ligne de admit_plans (ou du cache local) → Plan ; null si invalide ou supprimée. */
export function parsePlan(row: unknown): Plan | null {
  if (!isObj(row) || row.deleted === true) return null
  const { id, num, titre, fait } = row
  if (typeof id !== 'string' || !UUID.test(id)) return null
  if (!(num === null || num === undefined || (typeof num === 'number' && Number.isSafeInteger(num) && num > 0))) return null
  if (!isLabel(titre, LIMITS.title)) return null
  if (typeof fait !== 'boolean') return null
  const prix = enumOrNull<Price>(row.prix, PRICE_SET)
  const duree = enumOrNull<Duration>(row.duree, DURATION_SET)
  const lieu = enumOrNull<Place>(row.lieu, PLACE_SET)
  if (prix === undefined || duree === undefined || lieu === undefined) return null
  const saisons = labels(row.saisons, 6, 5, SEASON_SET) as Season[] | null
  const cats = labels(row.cats, LIMITS.category, LIMITS.catsPerPlan)
  if (!saisons || !cats) return null
  const createdAt = isoDate(row.created_at) ?? isoDate(row.createdAt) ?? new Date(0).toISOString()
  return { id, num: num ?? null, titre, prix, duree, saisons, lieu, cats, fait, createdAt }
}

/** Ligne de admit_categories → Category ; null si invalide ou supprimée. */
export function parseCategory(row: unknown): Category | null {
  if (!isObj(row) || row.deleted === true) return null
  const { id, label } = row
  if (typeof id !== 'string' || !UUID.test(id)) return null
  if (!isLabel(label, LIMITS.category)) return null
  return { id, label }
}

export function parseList<T>(rows: unknown, parse: (r: unknown) => T | null): T[] {
  if (!Array.isArray(rows)) return []
  const out: T[] = []
  for (const r of rows) {
    const v = parse(r)
    if (v) out.push(v)
    else if (!(isObj(r) && r.deleted === true)) console.warn('[admit] ignored malformed row', r)
  }
  return out
}
