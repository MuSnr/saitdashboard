import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/**
 * Load an original insurer PDF from a URL, stamp filled field values
 * and an optional signature image onto it, return as a downloadable blob.
 *
 * @param {string}   pdfUrl      - Cloudinary URL of the original PDF
 * @param {Array}    fieldMap    - [{ key, page, x, y, fontSize, fontStyle, maxWidth }]
 * @param {Object}   values      - { key: 'filled value', … }
 * @param {Object}   sigField    - { page, x, y, width, height }
 * @param {string}   sigDataUrl  - base64 PNG of signature (optional)
 * @returns {Blob}               - filled PDF blob
 */
export async function stampPdf({ pdfUrl, fieldMap, values, sigField, sigDataUrl }) {
  // Fetch original PDF bytes via proxy to avoid CORS issues
  const pdfRes  = await fetch(pdfUrl)
  const pdfBytes = await pdfRes.arrayBuffer()

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const pages  = pdfDoc.getPages()

  const helvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // mm → PDF points (1mm ≈ 2.8346 pt)
  const mm = (v) => v * 2.8346

  // Stamp each field
  for (const field of fieldMap) {
    const val = values[field.key]
    if (!val || !String(val).trim()) continue

    const pageIdx = (field.page || 1) - 1
    if (pageIdx >= pages.length) continue
    const page   = pages[pageIdx]
    const { height } = page.getSize()

    const font     = field.fontStyle === 'bold' ? helveticaBold : helvetica
    const fontSize = field.fontSize || 9
    const text     = String(val).trim()

    // PDF coordinate system: y=0 is bottom — convert from top
    const x = mm(field.x || 15)
    const y = height - mm(field.y || 15)

    // Simple word wrap if maxWidth set
    if (field.maxWidth) {
      const maxPt   = mm(field.maxWidth)
      const words   = text.split(' ')
      let line = ''
      let lineY = y
      for (const word of words) {
        const test     = line ? line + ' ' + word : word
        const testWidth = font.widthOfTextAtSize(test, fontSize)
        if (testWidth > maxPt && line) {
          page.drawText(line, { x, y: lineY, size: fontSize, font, color: rgb(0, 0, 0) })
          line  = word
          lineY -= fontSize * 1.3
        } else {
          line = test
        }
      }
      if (line) page.drawText(line, { x, y: lineY, size: fontSize, font, color: rgb(0, 0, 0) })
    } else {
      page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) })
    }
  }

  // Stamp signature image
  if (sigDataUrl && sigField) {
    const pageIdx = (sigField.page || 1) - 1
    if (pageIdx < pages.length) {
      const page = pages[pageIdx]
      const { height } = page.getSize()

      // Strip data URL prefix and decode
      const base64 = sigDataUrl.replace(/^data:image\/png;base64,/, '')
      const sigBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      const sigImage = await pdfDoc.embedPng(sigBytes)

      page.drawImage(sigImage, {
        x:      mm(sigField.x      || 15),
        y:      height - mm(sigField.y || 240) - mm(sigField.height || 20),
        width:  mm(sigField.width  || 60),
        height: mm(sigField.height || 20),
      })
    }
  }

  const filledBytes = await pdfDoc.save()
  return new Blob([filledBytes], { type: 'application/pdf' })
}

/** Download a filled PDF blob */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
