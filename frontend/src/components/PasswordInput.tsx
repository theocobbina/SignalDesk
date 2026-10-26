import { useState } from 'react'

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  className: string
  minLength?: number
}

/** A password field with a button to show or hide what's typed. */
export default function PasswordInput({ id, value, onChange, autoComplete, className, minLength = 6 }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        required
        type={visible ? 'text' : 'password'}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} pr-16`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 mt-1 flex items-center px-3 text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
