import { useEffect, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { clearAppData } from '@/lib/storage'

export type SessionState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User }

export function useSession(sb: SupabaseClient): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return
      setState(data.session ? { status: 'signedIn', user: data.session.user } : { status: 'signedOut' })
    })
    const { data } = sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') clearAppData()
      setState((prev) => {
        if (!session) return { status: 'signedOut' }
        // Évite de remonter tout l'écran à chaque rafraîchissement du jeton.
        if (prev.status === 'signedIn' && prev.user.id === session.user.id) return prev
        return { status: 'signedIn', user: session.user }
      })
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [sb])

  return state
}

export type Membership = 'checking' | 'member' | 'denied'

/** Vérifie admit_is_member() ; en cas d'erreur réseau on laisse passer (les règles RLS protègent de toute façon). */
export function useMembership(sb: SupabaseClient, userId: string): Membership {
  const [m, setM] = useState<Membership>('checking')
  useEffect(() => {
    let alive = true
    setM('checking')
    sb.rpc('admit_is_member').then(({ data, error }) => {
      if (!alive) return
      if (error) {
        console.warn('[admit] membership check failed', error)
        setM('member')
      } else setM(data === true ? 'member' : 'denied')
    })
    return () => {
      alive = false
    }
  }, [sb, userId])
  return m
}
