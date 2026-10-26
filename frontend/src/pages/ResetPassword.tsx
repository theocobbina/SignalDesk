import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput'
import { useAuth } from '../lib/authContext'
import { supabase } from '../lib/supabase'

const input =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'

// Supabase puts errors such as an expired link in the URL fragment: #error=...&error_description=...
const linkError = new URLSearchParams(window.location.hash.slice(1)).get('error_description')

/**
 * Opened from the password-reset email. Supabase signs the user in from the link,
 * then they choose a new password. Signed-in users can also use it to change theirs.
 */
export default function ResetPassword() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (session === undefined) return <p className="p-8 text-center text-gray-500">Loading…</p>

  if (!session) {
    return (
      <div className="mx-auto max-w-sm rounded-lg border bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Link expired or invalid</h1>
        <p className="mt-1 text-sm text-gray-600">
          {linkError ?? 'This password reset link has expired or was already used.'} Request a new one from the sign-in
          page.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError("The passwords don't match.")
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    setDone(true)
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm rounded-lg border bg-white p-6 text-center shadow-sm">
        <div className="text-4xl">✅</div>
        <h1 className="mt-2 text-xl font-semibold">Password updated</h1>
        <p className="mt-1 text-sm text-gray-600">Use your new password next time you sign in.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Continue to SignalDesk
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-center text-2xl font-semibold">Set a new password</h1>
      <p className="mt-1 text-center text-sm text-gray-600">For {session.user.email}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-lg border bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="new-password" className="text-sm font-medium">
            New password
          </label>
          <PasswordInput
            id="new-password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            className={input}
          />
          <p className="mt-1 text-xs text-gray-500">At least 6 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="text-sm font-medium">
            Confirm new password
          </label>
          <PasswordInput
            id="confirm-password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            className={input}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </div>
  )
}
