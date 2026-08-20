import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/**
 * Load an original insurer PDF from GridFS (via proxy), stamp filled field values
 * and an optional signature image onto it, return as a downloadable blob.
 *
 * Coordinate system:
 *   - fieldMap stores (x, y) in mm measured from the TOP-LEFT of the page
 *     (as clicked in the visual mapper).
 *   - pdf-lib uses points measured from the BOTTOM-LEFT.
 *   - Conversion: xPt = x_mm * 2.8346
 *                 yPt = pageHeight_pt - (y_mm * 2.8346)
 *
 * @param {string}   templateId  - template _id — used to fetch via proxy with auth
 * @param {Array}    fieldMap    - [{ key, page, x, y, fontSize, fontStyle, maxWidth }]
 * @param {Object}   values      - { key: 'filled value', … }
 * @param {Object}   sigField    - { page, x, y, width, height }
 * @param {string}   sigDataUrl  - base64 PNG of signature (optional)
 * @returns {Blob}               - filled PDF blob
 */
export async function stampPdf({ templateId, fieldMap, values, sigField, sigDataUrl }) {
  const token    = localStorage.getItem('sait-token')
  const fetchUrl = `${import.meta.env.VITE_API_URL || '/api'}/claim-templates/${templateId}/pdf`

  const pdfRes  = await fetch(fetchUrl, { headers: { Authorization: `Bearer ${token}` } })
  if (!pdfRes.ok) throw new Error(`Could not fetch PDF: HTTP ${pdfRes.status}`)
  const pdfBytes = await pdfRes.arrayBuffer()

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const pages  = pdfDoc.getPages()

  const helvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // mm → PDF points (1 mm = 2.8346 pt)
  const mmToPt = (v) => v * 2.8346

  // ── Stamp text fields ──────────────────────────────────────────────────────
  for (const field of fieldMap) {
    const val = values[field.key]
    if (val === undefined || val === null || !String(val).trim()) continue

    const pageIdx = (field.page || 1) - 1
    if (pageIdx >= pages.length) continue

    const page            = pages[pageIdx]
    const { width: pgW, height: pgH } = page.getSize()   // actual pts from pdf-lib

    const font     = field.fontStyle === 'bold' ? helveticaBold : helvetica
    const fontSize = field.fontSize  || 9
    const text     = String(val).trim()

    // Convert mm (from top-left) → pt (from bottom-left)
    // Use ?? 0 not || to allow legitimate x=0 or y=0 coordinates
    const xPt = mmToPt(field.x ?? 0)
    const yPt = pgH - mmToPt(field.y ?? 0) - fontSize   // shift up by fontSize so text sits ON the line

    if (yPt < 0 || xPt > pgW) {
      console.warn(`stampPdf: field "${field.key}" coordinate out of page bounds, skipping`)
      continue
    }

    if (field.maxWidth) {
      // Simple word-wrap
      const maxPt  = mmToPt(field.maxWidth)
      const words  = text.split(' ')
      let line  = ''
      let lineY = yPt
      for (const word of words) {
        const test      = line ? `${line} ${word}` : word
        const testWidth = font.widthOfTextAtSize(test, fontSize)
        if (testWidth > maxPt && line) {
          page.drawText(line, { x: xPt, y: lineY, size: fontSize, font, color: rgb(0, 0, 0) })
          line  = word
          lineY -= fontSize * 1.4   // line height
        } else {
          line = test
        }
      }
      if (line) page.drawText(line, { x: xPt, y: lineY, size: fontSize, font, color: rgb(0, 0, 0) })
    } else {
      page.drawText(text, { x: xPt, y: yPt, size: fontSize, font, color: rgb(0, 0, 0) })
    }
  }

  // ── Stamp signature image ──────────────────────────────────────────────────
  if (sigDataUrl && sigField) {
    const pageIdx = (sigField.page || 1) - 1
    if (pageIdx < pages.length) {
      const page = pages[pageIdx]
      const { height: pgH } = page.getSize()   // actual pts

      const base64   = sigDataUrl.replace(/^data:image\/png;base64,/, '')
      const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const sigImage = await pdfDoc.embedPng(sigBytes)

      const sigW = mmToPt(sigField.width  || 60)
      const sigH = mmToPt(sigField.height || 20)
      const sigX = mmToPt(sigField.x      ?? 15)
      // y=0 in mapper is top of page; pdf-lib y=0 is bottom
      // position bottom of sig image at y + height from top
      const sigY = pgH - mmToPt(sigField.y ?? 0) - sigH

      page.drawImage(sigImage, { x: sigX, y: sigY, width: sigW, height: sigH })
    }
  }

  const filledBytes = await pdfDoc.save()
  return new Blob([filledBytes], { type: 'application/pdf' })
}

/** Trigger browser download of a blob */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
