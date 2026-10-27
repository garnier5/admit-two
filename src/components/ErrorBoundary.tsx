import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { resetDevice } from '@/lib/storage'

type State = { error: Error | null; attempt: number }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, attempt: 0 }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admit] render error', error, info.componentStack)
  }

  private retry = () => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))

  private reset = async () => {
    try {
      await supabase?.auth.signOut({ scope: 'local' })
    } catch {
      /* ignore */
    }
    await resetDevice()
    window.location.reload()
  }

  render() {
    if (!this.state.error) return <div key={this.state.attempt} className="contents">{this.props.children}</div>
    return (
      <div className="app">
        <main className="scroll">
          <div className="screen" role="alert">
            <p className="kicker">OUT OF ORDER</p>
            <h1 className="h1 h1-form">Something jammed</h1>
            <p className="lead">The booth hit a snag. Try again — and if it keeps happening, reset this device (you’ll need to sign in again; nothing is lost on the server).</p>
            <button type="button" className="primary" onClick={this.retry}>
              <RotateCcw size={20} aria-hidden="true" /> Try again
            </button>
            <button type="button" className="primary again" onClick={this.reset}>
              <Trash2 size={20} aria-hidden="true" /> Reset this device
            </button>
          </div>
        </main>
      </div>
    )
  }
}
