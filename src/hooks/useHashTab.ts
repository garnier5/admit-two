import { useCallback, useEffect, useState } from 'react'

export const TABS = ['tickets', 'issue', 'raffle'] as const
export type Tab = (typeof TABS)[number]

function fromHash(): Tab {
  const m = /^#\/([a-z]+)/.exec(window.location.hash)
  return m && (TABS as readonly string[]).includes(m[1]) ? (m[1] as Tab) : 'tickets'
}

/** Onglet courant reflété dans le hash `#/tickets`, `#/issue`, `#/raffle`. */
export function useHashTab(): [Tab, (t: Tab) => void] {
  const [tab, setTabState] = useState<Tab>(fromHash)

  useEffect(() => {
    if (window.location.hash !== '#/' + tab) history.replaceState(null, '', '#/' + tab)
    const onHash = () => setTabState(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- uniquement au montage

  const setTab = useCallback((t: Tab) => {
    if (window.location.hash !== '#/' + t) window.location.hash = '/' + t
    setTabState(t)
  }, [])

  return [tab, setTab]
}
