import { useState, type FormEvent } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Stars } from './TicketCard'

export function Login({ sb }: { sb: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      setError(
        !navigator.onLine
          ? 'You’re offline. Connect to sign in.'
          : error.code === 'invalid_credentials' || error.status === 400
            ? 'Wrong e-mail or password.'
            : 'Couldn’t sign in. Please try again.',
      )
    }
  }

  return (
    <div className="app">
      <main className="scroll">
        <form className="screen login" onSubmit={submit}>
          <header>
            <p className="kicker">BOOTH Nº2 · TICKET OFFICE</p>
            <h1 className="h1">
              Admit
              <br />
              two
            </h1>
          </header>
          <div className="login-ticket">
            <p className="ticket-num">
              SHOW YOUR PASS <Stars />
            </p>
            <div className="field">
              <label htmlFor="l-email" className="kicker">E-MAIL</label>
              <input
                id="l-email"
                className="text-input"
                type="email"
                inputMode="email"
                autoComplete="username"
                maxLength={254}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="l-pass" className="kicker">PASSWORD</label>
              <input
                id="l-pass"
                className="text-input"
                type="password"
                autoComplete="current-password"
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="primary" disabled={busy || !email.trim() || !password}>
            {busy ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </main>
    </div>
  )
}
