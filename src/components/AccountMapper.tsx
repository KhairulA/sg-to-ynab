import type { YnabAccount } from '../ynab/types'

interface Props {
  accountLabel: string
  accountNumber: string
  ynabAccounts: YnabAccount[]
  selectedAccountId: string | null
  onSelect: (accountId: string) => void
}

export function AccountMapper({
  accountLabel,
  ynabAccounts,
  selectedAccountId,
  onSelect,
}: Props) {
  const isMapped = !!selectedAccountId

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${isMapped ? 'bg-gray-50' : 'bg-yellow-50 border border-yellow-200'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{accountLabel}</p>
      </div>

      <span className="text-gray-400 text-sm shrink-0">&rarr;</span>

      <select
        value={selectedAccountId || ''}
        onChange={e => onSelect(e.target.value)}
        className={`
          text-sm rounded-lg px-3 py-2 border min-w-[200px]
          ${isMapped
            ? 'border-gray-300 bg-white'
            : 'border-yellow-400 bg-yellow-50'
          }
          focus:outline-none focus:ring-2 focus:ring-blue-500
        `}
      >
        <option value="">Select YNAB account...</option>
        {ynabAccounts.map(account => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </div>
  )
}
