import { useMemo } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { localBackend, remoteBackend } from '@/lib/backend'
import { clearAppData } from '@/lib/storage'
import { useMembership, useSession } from '@/hooks/useSession'
import { Login } from '@/components/Login'
import { Main } from '@/components/Main'

function Splash({ text }: { text: string }) {
  return (
    <div className="app">
      <main className="scroll splash">
        <p className="kicker">{text}</p>
      </main>
    </div>
  )
}

async function signOut(sb: SupabaseClient) {
  clearAppData()
  const { error } = await sb.auth.signOut()
  // Hors ligne, la révocation serveur échoue : on ferme au moins la session locale.
  if (error) await sb.auth.signOut({ scope: 'local' })
}

function Denied({ sb }: { sb: SupabaseClient }) {
  return (
    <div className="app">
      <main className="scroll">
        <div className="screen">
          <p className="kicker">BOOTH CLOSED</p>
          <h1 className="h1 h1-form">No pass for this account</h1>
          <p className="lead">This account isn’t on the guest list for Admit Two. Ask to be added, then sign in again.</p>
          <button type="button" className="primary" onClick={() => void signOut(sb)}>
            Sign out
          </button>
        </div>
      </main>
    </div>
  )
}

function SignedIn({ sb, user }: { sb: SupabaseClient; user: User }) {
  const membership = useMembership(sb, user.id)
  const backend = useMemo(() => remoteBackend(sb), [sb])
  if (membership === 'checking') return <Splash text="CHECKING YOUR PASS…" />
  if (membership === 'denied') return <Denied sb={sb} />
  return <Main key={user.id} backend={backend} cacheKey={'cache:' + user.id} onSignOut={() => void signOut(sb)} />
}

function Online({ sb }: { sb: SupabaseClient }) {
  const session = useSession(sb)
  if (session.status === 'loading') return <Splash text="OPENING THE BOOTH…" />
  if (session.status === 'signedOut') return <Login sb={sb} />
  return <SignedIn sb={sb} user={session.user} />
}

const demoBackend = localBackend()

export function App() {
  if (!supabase) return <Main backend={demoBackend} cacheKey={null} onSignOut={null} />
  return <Online sb={supabase} />
}
