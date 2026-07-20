import { jsPDF } from 'jspdf'

/**
 * Generate and download a Nova Pioneer branded incident report PDF.
 * @param {object} incident - Populated incident object from the backend
 */
export function downloadIncidentPdf(incident) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PAGE_W  = 210
  const MARGIN  = 15
  const CONTENT = PAGE_W - MARGIN * 2
  let y = 0

  // ── Colour palette ──────────────────────────────────────────────────────────
  const NAVY   = [10,  22, 40]
  const GREEN  = [74, 222, 128]
  const GRAY   = [107, 114, 128]
  const LGRAY  = [243, 244, 246]
  const WHITE  = [255, 255, 255]
  const RED    = [239, 68, 68]

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-ZA') : '—'
  const val     = (v) => v || '—'
  const newPage = () => {
    doc.addPage()
    y = MARGIN
    drawPageHeader()
  }
  const checkY = (needed = 10) => { if (y + needed > 275) newPage() }

  // ── Page header (repeated on each page) ─────────────────────────────────────
  const drawPageHeader = () => {
    // Navy bar
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, PAGE_W, 22, 'F')

    // Green logo box
    doc.setFillColor(...GREEN)
    doc.roundedRect(MARGIN, 4, 14, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...NAVY)
    doc.text('NP', MARGIN + 7, 12.5, { align: 'center' })

    // Title
    doc.setTextColor(...WHITE)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('INCIDENT NOTIFICATION REPORT', MARGIN + 18, 11)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Nova Pioneer Schools · Asset Reconciliation Platform', MARGIN + 18, 16.5)

    // Ref number top right
    if (incident.incident_ref) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(incident.incident_ref, PAGE_W - MARGIN, 11, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text('Reference', PAGE_W - MARGIN, 16.5, { align: 'right' })
    }

    y = 28
  }

  // ── Section header ───────────────────────────────────────────────────────────
  const sectionHeader = (num, title) => {
    checkY(12)
    doc.setFillColor(...NAVY)
    doc.rect(MARGIN, y, CONTENT, 8, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(`${num}  ${title}`, MARGIN + 3, y + 5.5)
    y += 10
  }

  // ── Field row ────────────────────────────────────────────────────────────────
  const field = (label, value, fullWidth = false) => {
    checkY(8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(label, MARGIN, y)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(8)

    const text   = String(value || '—')
    const maxW   = fullWidth ? CONTENT : CONTENT
    const lines  = doc.splitTextToSize(text, maxW)
    lines.forEach((line, i) => {
      if (i > 0) checkY(6)
      doc.text(line, MARGIN, y + 5)
      y += 5
    })
    y += 3
  }

  // ── Two-column field row ─────────────────────────────────────────────────────
  const fieldRow = (pairs) => {
    checkY(10)
    const colW = CONTENT / pairs.length
    pairs.forEach(([label, value], i) => {
      const x = MARGIN + i * colW
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...GRAY)
      doc.text(label, x, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(30, 30, 30)
      const lines = doc.splitTextToSize(String(value || '—'), colW - 4)
      lines.forEach((line, j) => {
        doc.text(line, x, y + 5 + j * 5)
      })
    })
    y += 5 + 5 + 3
  }

  // ── Status badge ─────────────────────────────────────────────────────────────
  const statusBadge = (status) => {
    const colours = {
      New:           [[219,234,254],[37,99,235]],
      'Under Review':[[254,243,199],[180,83,9]],
      Converted:     [[220,252,231],[22,163,74]],
      Dismissed:     [[243,244,246],[107,114,128]],
    }
    const [bg, fg] = colours[status] || colours['New']
    doc.setFillColor(...bg)
    doc.roundedRect(MARGIN, y, 30, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...fg)
    doc.text(status || 'New', MARGIN + 15, y + 4.7, { align: 'center' })
    y += 10
  }

  // ── Thin divider ─────────────────────────────────────────────────────────────
  const divider = () => {
    checkY(4)
    doc.setDrawColor(229, 231, 235)
    doc.line(MARGIN, y, MARGIN + CONTENT, y)
    y += 4
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BUILD PDF
  // ════════════════════════════════════════════════════════════════════════════
  drawPageHeader()

  // ── Status + reference summary strip ────────────────────────────────────────
  doc.setFillColor(...LGRAY)
  doc.rect(MARGIN, y, CONTENT, 14, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text('Status', MARGIN + 3, y + 4.5)
  doc.text('Reference', MARGIN + 40, y + 4.5)
  doc.text('Campus', MARGIN + 90, y + 4.5)
  doc.text('Date Submitted', MARGIN + 140, y + 4.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...NAVY)
  doc.text(val(incident.status), MARGIN + 3, y + 10.5)
  doc.text(val(incident.incident_ref), MARGIN + 40, y + 10.5)
  doc.text(val(incident.campus_id?.name || incident.campus_name), MARGIN + 90, y + 10.5)
  doc.text(fmtDate(incident.createdAt), MARGIN + 140, y + 10.5)
  y += 18

  // ── Section 1 — Reporter ─────────────────────────────────────────────────────
  sectionHeader('1', 'Reporter Information')
  fieldRow([['Full Name', incident.reporter_name], ['Email Address', incident.reporter_email]])
  fieldRow([['Campus / Duty Station', incident.campus_id?.name || '—'], ['Specific Location', incident.duty_station_detail]])
  divider()

  // ── Section 2 — Incident Details ────────────────────────────────────────────
  sectionHeader('2', 'Incident Details')
  fieldRow([['Date & Time', fmtDate(incident.incident_date_time)], ['Timing', incident.timing_type]])
  fieldRow([['Incident Type', incident.incident_type], ['Location Type', incident.incident_location_type]])
  field('Exact Location', incident.exact_location)
  field('Description', incident.description, true)
  divider()

  // ── Section 3 — People ──────────────────────────────────────────────────────
  sectionHeader('3', 'People Involved')
  field('Names of People Involved', incident.people_involved, true)
  field('Nature of Involvement', incident.involvement_description, true)
  divider()

  // ── Section 4 — Injuries ────────────────────────────────────────────────────
  sectionHeader('4', 'Injuries')
  field('Injured Persons', incident.injured_persons)
  field('Description of Injuries', incident.injury_description, true)
  field('Actions Taken', incident.injury_actions_taken, true)
  divider()

  // ── Section 5 — Property Damage ─────────────────────────────────────────────
  sectionHeader('5', 'Property Damage / Loss')
  field('Type of Damage', incident.property_damage_type)
  field('Items Damaged or Lost', incident.property_description, true)
  field('Nature of Damage', incident.damage_description, true)
  field('Post-Incident Actions', incident.post_incident_actions, true)
  field('Prevention Actions', incident.prevention_actions, true)
  divider()

  // ── Section 6 — Additional ──────────────────────────────────────────────────
  sectionHeader('6', 'Additional Information')
  field('Additional Comments', incident.additional_comments, true)
  divider()

  // ── Section 7 — Notifications ───────────────────────────────────────────────
  sectionHeader('7', 'Notifications')
  field('People Notified', incident.notifications_list, true)
  divider()

  // ── Linked Claim ─────────────────────────────────────────────────────────────
  if (incident.linked_claim_id) {
    checkY(14)
    doc.setFillColor(220, 252, 231)
    doc.rect(MARGIN, y, CONTENT, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(22, 163, 74)
    doc.text(`Converted to Claim: ${incident.linked_claim_id?.claimId || incident.linked_claim_id}`, MARGIN + 4, y + 6.5)
    y += 14
  }

  // ── Footer on last page ──────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(229, 231, 235)
    doc.line(MARGIN, 285, PAGE_W - MARGIN, 285)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text('© 2026 Nova Pioneer · SAIT Asset Reconciliation Platform · CONFIDENTIAL', MARGIN, 290)
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN, 290, { align: 'right' })
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const filename = `Incident_${incident.incident_ref || 'Report'}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
