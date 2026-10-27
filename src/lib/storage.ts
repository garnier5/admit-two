// Accès à localStorage protégé (navigation privée, quota, données corrompues).
export const PREFIX = 'admit:'

export function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* stockage indisponible : on continue sans cache */
  }
}

/** Efface toutes les données locales de l'app (cache, démo). Appelé à la déconnexion. */
export function clearAppData() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}

/** « Reset this device » : données de l'app, session Supabase et caches du service worker. */
export async function resetDevice() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX) || k.startsWith('sb-')) localStorage.removeItem(k)
    }
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
  try {
    if ('caches' in window) for (const k of await caches.keys()) await caches.delete(k)
  } catch {
    /* ignore */
  }
}
