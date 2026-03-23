import { useState, useCallback, useRef } from 'react'

interface Props {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export function DropZone({ onFilesSelected, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }, [onFilesSelected, disabled])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }, [onFilesSelected])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
        ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      <div className="text-4xl mb-3">
        {isDragging ? '\u{1F4E5}' : '\u{1F4C4}'}
      </div>

      <p className="text-lg font-medium text-gray-700 mb-1">
        {isDragging ? 'Drop PDF here' : 'Drop bank eStatement PDF here'}
      </p>
      <p className="text-sm text-gray-500">
        or click to browse. Supports DBS/POSB, UOB statements.
      </p>
      <p className="text-xs text-gray-400 mt-3">
        All processing happens locally in your browser. Nothing is uploaded.
      </p>
    </div>
  )
}
