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

/**
 * « Reset this device » : données de l'app, sa session et ses caches de service worker.
 * Mealer partage l'origine : on ne touche qu'à ce qui appartient à Admit Two.
 */
export async function resetDevice(authKey: string) {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX) || k.startsWith(authKey)) localStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
  try {
    const scope = new URL(import.meta.env.BASE_URL, window.location.origin).href
    if ('caches' in window) for (const k of await caches.keys()) if (k.includes(scope)) await caches.delete(k)
  } catch {
    /* ignore */
  }
}
