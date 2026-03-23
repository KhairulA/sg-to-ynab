import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DropZone } from './DropZone'

describe('DropZone', () => {
  it('renders default text', () => {
    render(<DropZone onFilesSelected={vi.fn()} />)
    expect(screen.getByText('Drop bank eStatement PDF here')).toBeInTheDocument()
    expect(screen.getByText(/or click to browse/)).toBeInTheDocument()
    expect(screen.getByText(/All processing happens locally/)).toBeInTheDocument()
  })

  it('has a hidden file input accepting PDFs', () => {
    render(<DropZone onFilesSelected={vi.fn()} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toBe('.pdf')
    expect(input.multiple).toBe(true)
  })

  it('calls onFilesSelected when file input changes', () => {
    const onFiles = vi.fn()
    render(<DropZone onFilesSelected={onFiles} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFiles).toHaveBeenCalledWith([file])
  })

  it('does not call onFilesSelected for empty file list', () => {
    const onFiles = vi.fn()
    render(<DropZone onFilesSelected={onFiles} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('shows drag text on drag over', () => {
    render(<DropZone onFilesSelected={vi.fn()} />)
    const zone = screen.getByText('Drop bank eStatement PDF here').closest('div')!
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(screen.getByText('Drop PDF here')).toBeInTheDocument()
  })

  it('reverts text on drag leave', () => {
    render(<DropZone onFilesSelected={vi.fn()} />)
    const zone = screen.getByText('Drop bank eStatement PDF here').closest('div')!
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    fireEvent.dragLeave(zone, { dataTransfer: { files: [] } })
    expect(screen.getByText('Drop bank eStatement PDF here')).toBeInTheDocument()
  })

  it('calls onFilesSelected on drop with PDF files', () => {
    const onFiles = vi.fn()
    render(<DropZone onFilesSelected={onFiles} />)
    const zone = screen.getByText('Drop bank eStatement PDF here').closest('div')!
    const pdfFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    const txtFile = new File(['txt'], 'test.txt', { type: 'text/plain' })
    fireEvent.drop(zone, { dataTransfer: { files: [pdfFile, txtFile] } })
    expect(onFiles).toHaveBeenCalledWith([pdfFile])
  })

  it('does not call onFilesSelected on drop with no PDF files', () => {
    const onFiles = vi.fn()
    render(<DropZone onFilesSelected={onFiles} />)
    const zone = screen.getByText('Drop bank eStatement PDF here').closest('div')!
    const txtFile = new File(['txt'], 'test.txt', { type: 'text/plain' })
    fireEvent.drop(zone, { dataTransfer: { files: [txtFile] } })
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('disables interaction when disabled', () => {
    const onFiles = vi.fn()
    render(<DropZone onFilesSelected={onFiles} disabled />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.disabled).toBe(true)

    // Drag over should not change text when disabled
    const zone = screen.getByText('Drop bank eStatement PDF here').closest('div')!
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(screen.getByText('Drop bank eStatement PDF here')).toBeInTheDocument()
  })

  it('ignores drop when disabled', () => {
    const onFiles = vi.fn()
    render(<DropZone onFilesSelected={onFiles} disabled />)
    const zone = screen.getByText('Drop bank eStatement PDF here').closest('div')!
    const pdfFile = new File(['pdf'], 'test.pdf', { type: 'application/pdf' })
    fireEvent.drop(zone, { dataTransfer: { files: [pdfFile] } })
    expect(onFiles).not.toHaveBeenCalled()
  })

  it('opens file dialog on click', () => {
    render(<DropZone onFilesSelected={vi.fn()} />)
    const zone = screen.getByText('Drop bank eStatement PDF here').closest('div')!
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')
    fireEvent.click(zone)
    expect(clickSpy).toHaveBeenCalled()
  })

  it('does not open file dialog on click when disabled', () => {
    render(<DropZone onFilesSelected={vi.fn()} disabled />)
    const zone = screen.getByText('Drop bank eStatement PDF here').closest('div')!
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')
    fireEvent.click(zone)
    expect(clickSpy).not.toHaveBeenCalled()
  })

  it('accepts files by .pdf extension even without correct MIME type', () => {
    const onFiles = vi.fn()
    render(<DropZone onFilesSelected={onFiles} />)
    const zone = screen.getByText('Drop bank eStatement PDF here').closest('div')!
    const file = new File(['pdf'], 'test.pdf', { type: '' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(onFiles).toHaveBeenCalledWith([file])
  })
})
