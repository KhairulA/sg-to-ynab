interface Props {
  created: number
  duplicates: number
  errors: string[]
  onDone: () => void
}

export function ImportResult({ created, duplicates, errors, onDone }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-md mx-auto text-center">
      <div className="text-3xl mb-3">
        {errors.length > 0 ? '\u26A0\uFE0F' : '\u2705'}
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-4">Import Complete</h3>

      <div className="space-y-2 text-sm mb-6">
        {created > 0 && (
          <p className="text-green-700">
            <span className="font-medium">{created}</span> transactions created
          </p>
        )}
        {duplicates > 0 && (
          <p className="text-gray-500">
            <span className="font-medium">{duplicates}</span> duplicates skipped
          </p>
        )}
        {errors.length > 0 && (
          <div className="text-red-600">
            <p className="font-medium">{errors.length} error(s):</p>
            {errors.map((err, i) => (
              <p key={i} className="text-xs mt-1">{err}</p>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onDone}
        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        Import Another Statement
      </button>
    </div>
  )
}
