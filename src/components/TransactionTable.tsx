import { formatSGD } from '../lib/amounts'
import type { ParsedTransaction } from '../parsers/types'

export interface TransactionRow extends ParsedTransaction {
  included: boolean
  id: string // unique ID for React keys
}

interface Props {
  transactions: TransactionRow[]
  onToggle: (id: string) => void
  onToggleAll: (included: boolean) => void
  onEdit: (id: string, field: 'payeeName' | 'memo' | 'amount', value: string) => void
}

export function TransactionTable({ transactions, onToggle, onToggleAll, onEdit }: Props) {
  const allIncluded = transactions.every(t => t.included)
  const noneIncluded = transactions.every(t => !t.included)
  const includedCount = transactions.filter(t => t.included).length

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-2 pr-3 w-8">
              <input
                type="checkbox"
                checked={allIncluded}
                ref={el => { if (el) el.indeterminate = !allIncluded && !noneIncluded }}
                onChange={() => onToggleAll(!allIncluded)}
                className="rounded border-gray-300"
              />
            </th>
            <th className="pb-2 pr-3 text-gray-500 font-medium">Date</th>
            <th className="pb-2 pr-3 text-gray-500 font-medium">Payee</th>
            <th className="pb-2 pr-3 text-gray-500 font-medium">Memo</th>
            <th className="pb-2 text-gray-500 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(txn => (
            <tr
              key={txn.id}
              className={`border-b border-gray-100 ${txn.included ? '' : 'opacity-40'}`}
            >
              <td className="py-2 pr-3">
                <input
                  type="checkbox"
                  checked={txn.included}
                  onChange={() => onToggle(txn.id)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{txn.date}</td>
              <td className="py-2 pr-3">
                <input
                  type="text"
                  value={txn.payeeName}
                  onChange={e => onEdit(txn.id, 'payeeName', e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-gray-900 focus:outline-none focus:ring-0 hover:bg-gray-50 rounded px-1 -mx-1"
                />
              </td>
              <td className="py-2 pr-3">
                <input
                  type="text"
                  value={txn.memo}
                  onChange={e => onEdit(txn.id, 'memo', e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-gray-500 text-xs focus:outline-none focus:ring-0 hover:bg-gray-50 rounded px-1 -mx-1"
                />
              </td>
              <td className={`py-2 text-right font-mono whitespace-nowrap ${txn.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatSGD(txn.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-500 mt-2">
        {includedCount} of {transactions.length} transactions selected
      </p>
    </div>
  )
}
