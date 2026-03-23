import * as pdfjsLib from 'pdfjs-dist'
import type { TextItem as PdfTextItem } from 'pdfjs-dist/types/src/display/api'
import type { PageContent, TextItem } from './types'

// Set worker source to CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/**
 * Extract all text items with positions from a PDF file.
 * Handles password-protected PDFs via the password parameter.
 */
export async function extractPdfText(
  data: ArrayBuffer,
  password?: string
): Promise<PageContent[]> {
  const loadingTask = pdfjsLib.getDocument({
    data,
    password: password || undefined,
  })

  const pdf = await loadingTask.promise
  const pages: PageContent[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.0 })
    const textContent = await page.getTextContent()

    const items: TextItem[] = []

    for (const item of textContent.items) {
      const textItem = item as PdfTextItem
      if (!textItem.str || textItem.str.trim() === '') continue

      // PDF coordinates: origin at bottom-left
      // Convert to top-left origin
      const tx = textItem.transform
      const x = tx[4]
      const y = viewport.height - tx[5]

      items.push({
        str: textItem.str,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(textItem.width * 100) / 100,
        height: Math.round(textItem.height * 100) / 100,
        fontName: textItem.fontName,
      })
    }

    pages.push({
      pageNumber: i,
      items,
      width: viewport.width,
      height: viewport.height,
    })
  }

  return pages
}

/**
 * Check if a PDF load error is a password error.
 */
export function isPasswordError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('No password given') ||
      error.message.includes('Incorrect Password')
  }
  return false
}

/**
 * Check if it's specifically an incorrect password (vs no password given).
 */
export function isIncorrectPassword(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Incorrect Password')
  }
  return false
}
