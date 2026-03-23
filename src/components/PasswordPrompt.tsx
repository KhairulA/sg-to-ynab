import { useState } from 'react'

interface Props {
  fileName: string
  isIncorrect: boolean
  onSubmit: (password: string) => void
  onCancel: () => void
}

export function PasswordPrompt({ fileName, isIncorrect, onSubmit, onCancel }: Props) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password) onSubmit(password)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-md mx-auto">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Password Required</h3>
      <p className="text-sm text-gray-600 mb-1">
        <span className="font-medium">{fileName}</span> is password-protected.
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Common passwords: last 4 digits of NRIC, or date of birth (DDMMYYYY).
      </p>

      {isIncorrect && (
        <p className="text-sm text-red-600 mb-3">Incorrect password. Please try again.</p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Enter password"
          autoFocus
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!password}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Unlock
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 px-3 py-2 rounded-lg text-sm hover:bg-gray-100"
        >
          Cancel
        </button>
      </form>
    </div>
  )
}
