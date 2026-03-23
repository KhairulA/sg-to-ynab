import { useState } from 'react'
import { loadMappings, loadHistory, type AccountMapping, type ImportRecord } from '../lib/config'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function Settings({ isOpen, onClose }: Props) {
  const [mappings] = useState<AccountMapping[]>(loadMappings)
  const [history] = useState<ImportRecord[]>(loadHistory)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-8">
          {/* Account Mappings */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Saved Account Mappings</h3>
            {mappings.length === 0 ? (
              <p className="text-sm text-gray-500">No mappings saved yet.</p>
            ) : (
              <div className="space-y-2">
                {mappings.map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-gray-900">{m.accountLabel}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      &rarr; {m.ynabAccountName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Import History */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Import History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No imports yet.</p>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 20).map((h, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-900">{h.fileName}</span>
                      <span className="text-gray-400 text-xs">
                        {new Date(h.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {h.transactionsCreated} created, {h.transactionsSkipped} skipped
                      {h.errors > 0 && `, ${h.errors} errors`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Privacy */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Privacy</h3>
            <p className="text-sm text-gray-500">
              All PDF processing happens locally in your browser. No data is uploaded to any server.
              Only transaction data is sent to YNAB's API when you click "Push to YNAB".
            </p>
            <a
              href="https://github.com/KhairulA/sg-to-ynab/blob/main/PRIVACY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline mt-2 inline-block"
            >
              Privacy Policy
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}
