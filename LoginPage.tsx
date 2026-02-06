import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      window.location.href = '/'
    } catch (err: any) {
      setError(err?.message ?? 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h2>Sign in</h2>
      <div className="card">
        <form onSubmit={signIn}>
          <div style={{ display: 'grid', gap: 10 }}>
            <label>
              <div className="label">Email</div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #233152', background: '#0b1220', color: '#e8eefc' }} />
            </label>
            <label>
              <div className="label">Password</div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #233152', background: '#0b1220', color: '#e8eefc' }} />
            </label>
            <button className="btn" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
            {error ? <div className="label" style={{ color: '#ff8b8b' }}>{error}</div> : null}
          </div>
        </form>
      </div>
      <div className="label" style={{ marginTop: 12 }}>
        Admin creates users in Supabase Auth. Profiles row must exist for your user id.
      </div>
    </div>
  )
}
