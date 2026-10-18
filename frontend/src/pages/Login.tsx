import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { supabase } from '../lib/supabase'

const input =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'

export default function Login() {
  const { session } = useAuth()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  if (session) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
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
    if (mode === 'signup' && !data.session) setCheckEmail(true)
  }

  if (checkEmail) {
    return (
      <div className="mx-auto max-w-sm rounded-lg border bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">📬</div>
        <h1 className="mt-2 text-xl font-semibold">Check your email</h1>
        <p className="mt-1 text-sm text-gray-600">
          We sent a confirmation link to <span className="font-medium">{email}</span>. Click it, then sign in.
        </p>
        <button
          onClick={() => {
            setCheckEmail(false)
            setMode('signin')
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
      <h1 className="text-center text-2xl font-semibold">
        {mode === 'signin' ? 'Sign in to SignalDesk' : 'Create your account'}
      </h1>
      <p className="mt-1 text-center text-sm text-gray-600">Report and track dorm issues.</p>

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
        <label className="block text-sm font-medium">
          Password
          <input
            required
            type="password"
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
          }}
          className="font-medium text-blue-600 hover:underline"
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}
