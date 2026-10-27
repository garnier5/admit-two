import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const key = (import.meta.env.VITE_SUPABASE_KEY ?? '').trim()

function make(): SupabaseClient | null {
  if (!url || !key) return null
  if (!key.startsWith('sb_publishable_')) {
    // Jamais de clé secrète côté app : on refuse de démarrer avec autre chose.
    console.error('[admit] VITE_SUPABASE_KEY must be a publishable key (sb_publishable_…). Running offline.')
    return null
  }
  try {
    new URL(url)
  } catch {
    console.error('[admit] VITE_SUPABASE_URL is not a valid URL. Running offline.')
    return null
  }
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
}

/** null quand les clés manquent (mode `dev:offline`) : l'app tourne alors sur des données de démo locales. */
export const supabase = make()
