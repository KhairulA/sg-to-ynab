import { startOAuthFlow, isOAuthConfigured } from '../ynab/oauth'

interface Props {
  token: string | null
  onDisconnect: () => void
}

export function YnabConnect({ token, onDisconnect }: Props) {
  if (!isOAuthConfigured()) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        <p className="font-medium">YNAB not configured</p>
        <p className="mt-1">
          Set <code className="bg-yellow-100 px-1 rounded">VITE_YNAB_CLIENT_ID</code> in your{' '}
          <code className="bg-yellow-100 px-1 rounded">.env</code> file to enable YNAB integration.
        </p>
      </div>
    )
  }

  if (token) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Connected to YNAB
        </span>
        <button
          onClick={onDisconnect}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={startOAuthFlow}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
    >
      Connect to YNAB
    </button>
  )
}
