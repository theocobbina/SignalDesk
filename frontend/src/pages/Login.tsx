import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../lib/authContext'
import { supabase } from '../lib/supabase'

const input =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'

type Mode = 'signin' | 'signup' | 'forgot'

const TITLES: Record<Mode, string> = {
  signin: 'Sign in to SignalDesk',
  signup: 'Create your account',
  forgot: 'Reset your password',
}

const SUBMIT: Record<Mode, string> = {
  signin: 'Sign in',
  signup: 'Create account',
  forgot: 'Send reset link',
}

export default function Login() {
  const { session } = useAuth()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [mode, setMode] = useState<Mode>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<{ email: string; why: 'confirm' | 'reset' } | null>(null)

  if (session) return <Navigate to={from} replace />

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setBusy(false)
      if (error) return setError(error.message)
      return setSentTo({ email, why: 'reset' })
    }

    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
          })
    setBusy(false)
    if (error) return setError(error.message)
    // With email confirmation on, sign-up returns no session until the link is clicked.
    if (mode === 'signup' && !data.session) setSentTo({ email, why: 'confirm' })
  }

  if (sentTo) {
    return (
      <div className="mx-auto max-w-sm rounded-lg border bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">📬</div>
        <h1 className="mt-2 text-xl font-semibold">Check your email</h1>
        <p className="mt-1 text-sm text-gray-600">
          {sentTo.why === 'confirm' ? (
            <>
              We sent a confirmation link to <span className="font-medium">{sentTo.email}</span>. Click it, then sign
              in.
            </>
          ) : (
            <>
              If an account exists for <span className="font-medium">{sentTo.email}</span>, we sent a link to set a new
              password.
            </>
          )}
        </p>
        <button
          onClick={() => {
            setSentTo(null)
            switchMode('signin')
          }}
          className="mt-4 text-sm font-medium text-blue-600 hover:underline"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-center text-2xl font-semibold">{TITLES[mode]}</h1>
      <p className="mt-1 text-center text-sm text-gray-600">
        {mode === 'forgot'
          ? "Enter your email and we'll send you a link to set a new password."
          : 'Report and track dorm issues.'}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        {mode === 'signup' && (
          <label className="block text-sm font-medium">
            Full name
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        {mode !== 'forgot' && (
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className={input}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Please wait…' : SUBMIT[mode]}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        {mode === 'signup' ? 'Already have an account? ' : mode === 'signin' ? "Don't have an account? " : ''}
        <button
          onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
          className="font-medium text-blue-600 hover:underline"
        >
          {mode === 'signin' ? 'Sign up' : mode === 'signup' ? 'Sign in' : 'Back to sign in'}
        </button>
      </p>
    </div>
  )
}
