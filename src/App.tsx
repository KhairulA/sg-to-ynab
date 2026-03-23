import { useState, useEffect, useCallback } from 'react'
import { DropZone } from './components/DropZone'
import { PasswordPrompt } from './components/PasswordPrompt'
import { TransactionTable, type TransactionRow } from './components/TransactionTable'
import { AccountMapper } from './components/AccountMapper'
import { ImportResult } from './components/ImportResult'
import { YnabConnect } from './components/YnabConnect'
import { Settings } from './components/Settings'
import { extractPdfText, isPasswordError, isIncorrectPassword } from './parsers/pdfExtractor'
import { parseStatement, type AccountSection } from './parsers/index'
import { extractTokenFromHash } from './ynab/oauth'
import { listBudgets, listAccounts, createTransactions, YnabApiError } from './ynab/client'
import { assignImportIds } from './ynab/importId'
import { toMilliunits } from './lib/amounts'
import { findMapping, upsertMapping, addHistoryRecord, loadBudgetId, saveBudgetId } from './lib/config'
import type { YnabBudget, YnabAccount } from './ynab/types'

type AppState = 'idle' | 'parsing' | 'password' | 'preview' | 'pushing' | 'done' | 'error'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export default function App() {
  // Auth
  const [token, setToken] = useState<string | null>(null)
  const [budgets, setBudgets] = useState<YnabBudget[]>([])
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>(loadBudgetId() || '')
  const [ynabAccounts, setYnabAccounts] = useState<YnabAccount[]>([])

  // State
  const [appState, setAppState] = useState<AppState>('idle')
  const [error, setError] = useState<string>('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  // PDF
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [currentData, setCurrentData] = useState<ArrayBuffer | null>(null)
  const [passwordIncorrect, setPasswordIncorrect] = useState(false)

  // Parsed
  const [bankName, setBankName] = useState('')
  const [sections, setSections] = useState<AccountSection[]>([])
  const [transactionRows, setTransactionRows] = useState<Map<string, TransactionRow[]>>(new Map())
  const [accountMappings, setAccountMappings] = useState<Map<string, string>>(new Map())

  // Result
  const [result, setResult] = useState<{ created: number; duplicates: number; errors: string[] }>({
    created: 0, duplicates: 0, errors: [],
  })

  // Extract token on mount
  useEffect(() => {
    const tokenData = extractTokenFromHash()
    if (tokenData) {
      setToken(tokenData.accessToken)
    }
  }, [])

  // Fetch budgets when token is available
  useEffect(() => {
    if (!token) return
    listBudgets(token).then(budgets => {
      setBudgets(budgets)
      const savedId = loadBudgetId()
      if (savedId && budgets.some(b => b.id === savedId)) {
        setSelectedBudgetId(savedId)
      } else if (budgets.length === 1) {
        setSelectedBudgetId(budgets[0].id)
        saveBudgetId(budgets[0].id)
      }
    }).catch(() => {
      // Token may be expired
    })
  }, [token])

  // Fetch accounts when budget is selected
  useEffect(() => {
    if (!token || !selectedBudgetId) return
    saveBudgetId(selectedBudgetId)
    listAccounts(token, selectedBudgetId).then(setYnabAccounts).catch(() => {})
  }, [token, selectedBudgetId])

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    setCurrentFile(file)
    setError('')
    setAppState('parsing')

    const buffer = await file.arrayBuffer()
    setCurrentData(buffer)

    try {
      const pages = await extractPdfText(buffer)
      processPages(pages, file.name)
    } catch (err) {
      if (isPasswordError(err)) {
        setPasswordIncorrect(false)
        setAppState('password')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to parse PDF')
        setAppState('error')
      }
    }
  }, [])

  const handlePassword = useCallback(async (password: string) => {
    if (!currentData || !currentFile) return
    setAppState('parsing')

    try {
      const pages = await extractPdfText(currentData, password)
      processPages(pages, currentFile.name)
    } catch (err) {
      if (isPasswordError(err)) {
        setPasswordIncorrect(isIncorrectPassword(err))
        setAppState('password')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to parse PDF')
        setAppState('error')
      }
    }
  }, [currentData, currentFile])

  function processPages(pages: Awaited<ReturnType<typeof extractPdfText>>, fileName: string) {
    const result = parseStatement(pages)
    if (!result) {
      setError(
        `Could not detect the bank for "${fileName}". ` +
        'Currently supported: DBS/POSB, UOB. Make sure you are using an official eStatement PDF.'
      )
      setAppState('error')
      return
    }

    setBankName(result.bankName)
    setSections(result.sections)

    // Build transaction rows
    const rowMap = new Map<string, TransactionRow[]>()
    const mappingMap = new Map<string, string>()

    for (const section of result.sections) {
      const key = `${section.bankId}:${section.accountNumber}`
      const rows: TransactionRow[] = section.transactions.map(txn => ({
        ...txn,
        included: true,
        id: generateId(),
      }))
      rowMap.set(key, rows)

      // Restore saved mapping
      const saved = findMapping(section.bankId, section.accountNumber)
      if (saved) {
        mappingMap.set(key, saved.ynabAccountId)
      }
    }

    setTransactionRows(rowMap)
    setAccountMappings(mappingMap)
    setAppState('preview')
  }

  const handleToggle = useCallback((sectionKey: string, id: string) => {
    setTransactionRows(prev => {
      const next = new Map(prev)
      const rows = next.get(sectionKey)
      if (rows) {
        next.set(sectionKey, rows.map(r => r.id === id ? { ...r, included: !r.included } : r))
      }
      return next
    })
  }, [])

  const handleToggleAll = useCallback((sectionKey: string, included: boolean) => {
    setTransactionRows(prev => {
      const next = new Map(prev)
      const rows = next.get(sectionKey)
      if (rows) {
        next.set(sectionKey, rows.map(r => ({ ...r, included })))
      }
      return next
    })
  }, [])

  const handleEdit = useCallback((sectionKey: string, id: string, field: 'payeeName' | 'memo' | 'amount', value: string) => {
    setTransactionRows(prev => {
      const next = new Map(prev)
      const rows = next.get(sectionKey)
      if (rows) {
        next.set(sectionKey, rows.map(r => {
          if (r.id !== id) return r
          if (field === 'amount') {
            const num = parseFloat(value)
            return { ...r, amount: isNaN(num) ? r.amount : num }
          }
          return { ...r, [field]: value }
        }))
      }
      return next
    })
  }, [])

  const handleMapAccount = useCallback((sectionKey: string, ynabAccountId: string) => {
    setAccountMappings(prev => {
      const next = new Map(prev)
      next.set(sectionKey, ynabAccountId)
      return next
    })

    // Save mapping
    const section = sections.find(s => `${s.bankId}:${s.accountNumber}` === sectionKey)
    const ynabAccount = ynabAccounts.find(a => a.id === ynabAccountId)
    if (section && ynabAccount) {
      upsertMapping({
        bankId: section.bankId,
        accountNumber: section.accountNumber,
        accountLabel: section.accountLabel,
        ynabAccountId: ynabAccount.id,
        ynabAccountName: ynabAccount.name,
      })
    }
  }, [sections, ynabAccounts])

  const handlePush = useCallback(async () => {
    if (!token || !selectedBudgetId) return

    setAppState('pushing')
    const errors: string[] = []
    let totalCreated = 0
    let totalDuplicates = 0

    for (const section of sections) {
      const key = `${section.bankId}:${section.accountNumber}`
      const ynabAccountId = accountMappings.get(key)
      if (!ynabAccountId) continue

      const rows = transactionRows.get(key) || []
      const included = rows.filter(r => r.included)
      if (included.length === 0) continue

      const txns = included.map(r => ({
        account_id: ynabAccountId,
        date: r.date,
        amount: toMilliunits(r.amount),
        payee_name: r.payeeName.slice(0, 50), // YNAB limit
        memo: r.memo.slice(0, 200),
        cleared: 'cleared' as const,
        approved: false,
      }))

      const withIds = assignImportIds(txns)

      try {
        const result = await createTransactions(token, selectedBudgetId, withIds)
        totalCreated += result.transaction_ids.length
        totalDuplicates += result.duplicate_import_ids.length
      } catch (err) {
        if (err instanceof YnabApiError) {
          errors.push(`${section.accountLabel}: ${err.detail}`)
        } else {
          errors.push(`${section.accountLabel}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }
    }

    setResult({ created: totalCreated, duplicates: totalDuplicates, errors })

    // Record in history
    if (currentFile) {
      addHistoryRecord({
        timestamp: Date.now(),
        fileName: currentFile.name,
        bankId: sections[0]?.bankId || 'unknown',
        transactionsCreated: totalCreated,
        transactionsSkipped: totalDuplicates,
        errors: errors.length,
      })
    }

    setAppState('done')
  }, [token, selectedBudgetId, sections, accountMappings, transactionRows, currentFile])

  const handleReset = useCallback(() => {
    setAppState('idle')
    setCurrentFile(null)
    setCurrentData(null)
    setSections([])
    setTransactionRows(new Map())
    setAccountMappings(new Map())
    setError('')
    setResult({ created: 0, duplicates: 0, errors: [] })
  }, [])

  const totalIncluded = Array.from(transactionRows.values())
    .flat()
    .filter(r => r.included).length

  const allMapped = sections.every(s => accountMappings.has(`${s.bankId}:${s.accountNumber}`))
  const canPush = token && selectedBudgetId && totalIncluded > 0 && allMapped

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">SG to YNAB</h1>
            <p className="text-xs text-gray-500">Singapore bank statement importer</p>
          </div>
          <div className="flex items-center gap-4">
            <YnabConnect token={token} onDisconnect={() => setToken(null)} />
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-gray-400 hover:text-gray-600"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Budget selector */}
        {token && budgets.length > 1 && (
          <div className="mb-6 flex items-center gap-3">
            <label className="text-sm text-gray-600">Budget:</label>
            <select
              value={selectedBudgetId}
              onChange={e => setSelectedBudgetId(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select budget...</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Idle state — drop zone */}
        {appState === 'idle' && (
          <DropZone onFilesSelected={handleFilesSelected} />
        )}

        {/* Parsing */}
        {appState === 'parsing' && (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Parsing statement...</p>
          </div>
        )}

        {/* Password prompt */}
        {appState === 'password' && currentFile && (
          <PasswordPrompt
            fileName={currentFile.name}
            isIncorrect={passwordIncorrect}
            onSubmit={handlePassword}
            onCancel={handleReset}
          />
        )}

        {/* Error */}
        {appState === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleReset}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Preview */}
        {appState === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {bankName} Statement
                </h2>
                <p className="text-sm text-gray-500">
                  {currentFile?.name} &mdash; {sections.length} account{sections.length !== 1 ? 's' : ''} found
                </p>
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                &times; Clear
              </button>
            </div>

            {sections.map(section => {
              const key = `${section.bankId}:${section.accountNumber}`
              const rows = transactionRows.get(key) || []

              return (
                <div key={key} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="mb-4">
                    <AccountMapper
                      accountLabel={section.accountLabel}
                      accountNumber={section.accountNumber}
                      ynabAccounts={ynabAccounts}
                      selectedAccountId={accountMappings.get(key) || null}
                      onSelect={id => handleMapAccount(key, id)}
                    />
                  </div>

                  <TransactionTable
                    transactions={rows}
                    onToggle={id => handleToggle(key, id)}
                    onToggleAll={included => handleToggleAll(key, included)}
                    onEdit={(id, field, value) => handleEdit(key, id, field, value)}
                  />
                </div>
              )
            })}

            {/* Push button */}
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                {totalIncluded} transaction{totalIncluded !== 1 ? 's' : ''} selected
                {!allMapped && <span className="text-yellow-600 ml-2">(map all accounts to push)</span>}
                {!token && <span className="text-yellow-600 ml-2">(connect to YNAB first)</span>}
              </p>
              <button
                onClick={handlePush}
                disabled={!canPush}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Push to YNAB ({totalIncluded})
              </button>
            </div>
          </div>
        )}

        {/* Pushing */}
        {appState === 'pushing' && (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Pushing transactions to YNAB...</p>
          </div>
        )}

        {/* Done */}
        {appState === 'done' && (
          <ImportResult
            created={result.created}
            duplicates={result.duplicates}
            errors={result.errors}
            onDone={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
          <p>
            SG to YNAB &mdash; Open source, client-side only.{' '}
            <a href="https://github.com/KhairulA/sg-to-ynab" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 underline">
              GitHub
            </a>
            {' '}&bull;{' '}
            <a href="https://github.com/KhairulA/sg-to-ynab/blob/main/PRIVACY.md" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 underline">
              Privacy Policy
            </a>
          </p>
          <p className="mt-1">All processing happens locally in your browser. No data is uploaded.</p>
        </div>
      </footer>

      {/* Settings panel */}
      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
