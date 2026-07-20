import { jsPDF } from 'jspdf'

/**
 * Generate Nova Pioneer branded Incident Notification Report PDF
 * Matches the original Google Form output exactly.
 */
export async function downloadIncidentPdf(incident) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PW     = 210
  const MARGIN = 18
  const CW     = PW - MARGIN * 2  // 174mm content width
  let y        = 0

  // ── Colours (matching original) ────────────────────────────────────────────
  const NAVY    = [10, 22, 40]
  const ORANGE  = [230, 90, 20]    // section header colour
  const BLACK   = [30, 30, 30]
  const LGRAY   = [240, 240, 240]
  const MGRAY   = [200, 200, 200]
  const WHITE   = [255, 255, 255]
  const DGRAY   = [100, 100, 100]

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).replace(',', '').toUpperCase()
  }
  const v = (val) => val || 'N/A'

  const checkY = (needed = 12) => { if (y + needed > 278) newPage() }

  const newPage = () => {
    // Footer on current page before adding new one
    drawFooter()
    doc.addPage()
    y = MARGIN
  }

  // ── Page footer ─────────────────────────────────────────────────────────────
  const drawFooter = () => {
    const pg  = doc.internal.getCurrentPageInfo().pageNumber
    const tot = doc.internal.getNumberOfPages()
    doc.setDrawColor(...MGRAY)
    doc.line(MARGIN, 287, PW - MARGIN, 287)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...DGRAY)
    doc.text(fmtDate(incident.createdAt || new Date()), MARGIN, 292)
    doc.text(`${pg} of ${tot} / Incident No.  ${incident.incident_ref || ''}`, PW - MARGIN, 292, { align: 'right' })
  }

  // ── Section header (orange bold underline style) ────────────────────────────
  const sectionHeader = (title) => {
    checkY(14)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...ORANGE)
    doc.text(title, MARGIN, y)
    y += 1.5
    doc.setDrawColor(...ORANGE)
    doc.setLineWidth(0.4)
    doc.line(MARGIN, y, MARGIN + CW, y)
    doc.setLineWidth(0.2)
    y += 5
  }

  // ── Full-width horizontal rule ───────────────────────────────────────────────
  const rule = () => {
    checkY(6)
    doc.setDrawColor(...MGRAY)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y, MARGIN + CW, y)
    y += 5
  }

  // ── Bold label + plain value (block style) ──────────────────────────────────
  const labelValue = (label, value) => {
    const text = String(value || 'N/A')
    const lines = doc.splitTextToSize(text, CW)
    const needed = 6 + lines.length * 5
    checkY(needed)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLACK)
    doc.text(label, MARGIN, y)
    y += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    lines.forEach((line) => { doc.text(line, MARGIN, y); y += 5 })
    y += 2
  }

  // ── Bordered table row (like Section 1 reporter table) ──────────────────────
  const tableRow = (cells) => {
    // cells = [{ label, value, w }]  w = fraction of CW (e.g. 0.33)
    const ROW_H = 14
    checkY(ROW_H + 2)
    let x = MARGIN
    cells.forEach(({ label, value, w }) => {
      const colW = CW * w
      doc.setDrawColor(...MGRAY)
      doc.setFillColor(...WHITE)
      doc.rect(x, y, colW, ROW_H, 'S')
      // label
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...DGRAY)
      doc.text(label, x + 2, y + 4.5)
      // value
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...BLACK)
      const lines = doc.splitTextToSize(String(value || ''), colW - 4)
      doc.text(lines[0] || '', x + 2, y + 10)
      x += colW
    })
    y += ROW_H + 1
  }

  // ── Two-column bordered cells (Section 2 location) ──────────────────────────
  const twoColTable = (left, right) => {
    const colW = CW / 2
    const leftLines  = doc.splitTextToSize(String(left.value  || ''), colW - 4)
    const rightLines = doc.splitTextToSize(String(right.value || ''), colW - 4)
    const rows = Math.max(leftLines.length, rightLines.length)
    const H = 7 + rows * 5
    checkY(H + 2)
    // left cell
    doc.setDrawColor(...MGRAY)
    doc.rect(MARGIN, y, colW, H, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(left.label, MARGIN + 2, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    leftLines.forEach((l, i) => doc.text(l, MARGIN + 2, y + 11 + i * 5))
    // right cell
    doc.rect(MARGIN + colW, y, colW, H, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(right.label, MARGIN + colW + 2, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    rightLines.forEach((l, i) => doc.text(l, MARGIN + colW + 2, y + 11 + i * 5))
    y += H + 2
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 HEADER
  // ════════════════════════════════════════════════════════════════════════════
  y = MARGIN

  // Nova Pioneer logo — load from public folder
  try {
    const response = await fetch('/nova-pioneer-logo.png')
    const blob = await response.blob()
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    doc.addImage(dataUrl, 'PNG', MARGIN, y, 55, 18)
  } catch {
    // Fallback — draw text logo if image fails
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(26, 58, 107)
    doc.text('NOVA PIONEER', MARGIN, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('SCHOOLS FOR INNOVATORS & LEADERS', MARGIN, y + 14)
  }

  // Right side header text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...BLACK)
  doc.text('SECURITY SERVICES', PW - MARGIN, y + 5, { align: 'right' })
  // Orange ref
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ORANGE)
  doc.text(`Incident Ref  |  ${incident.incident_ref || '—'}`, PW - MARGIN, y + 12, { align: 'right' })
  // Submitted date
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...DGRAY)
  doc.text(`Report Submitted on : ${fmtDate(incident.createdAt || new Date())}`, PW - MARGIN, y + 18, { align: 'right' })

  y += 26

  // ── Title bar ───────────────────────────────────────────────────────────────
  doc.setFillColor(60, 60, 100)
  doc.rect(MARGIN, y, CW, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...WHITE)
  doc.text('INCIDENT NOTIFICATION REPORT', PW / 2, y + 7, { align: 'center' })
  y += 15

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 1 — Reporter's Details
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 1 : Reporter\'s Details')

  tableRow([
    { label: 'a) Report compiled by',              value: incident.reporter_name,                      w: 0.33 },
    { label: 'b) Reporter\'s normal duty station', value: incident.campus_id?.name || incident.campus_name || '—', w: 0.34 },
    { label: 'c) Date and time of the incident',   value: fmtDate(incident.incident_date_time),        w: 0.33 },
  ])

  const timingText = incident.timing_type === 'Occurred'
    ? 'This is when the incident occurred.'
    : 'This is when the incident was noticed.'
  labelValue('d) Is the date and time indicated above when the incident occurred or when the incident was noticed?', timingText)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 2 — Incident Details
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 2 : Incident Details')
  twoColTable(
    { label: 'a) Where did the incident happen?',              value: incident.incident_location_type || '—' },
    { label: 'b) What was the exact location of the incident?', value: incident.exact_location || '—' }
  )
  labelValue('c) Brief description of the incident.', incident.description)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 3 — People Involved
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 3 : People Involved')
  labelValue('a) List the name(s) of people who were involved in or witnessed the incident.', incident.people_involved)
  labelValue('b) Briefly describe the nature of their involvement in the incident.', incident.involvement_description)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 4 — Injuries
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 4 : Injuries')
  labelValue('a) Names of person or persons injured during the incident if any.', incident.injured_persons)
  labelValue('b) Brief description of the nature of the injury or injuries.', incident.injury_description)
  labelValue('c) Brief account of the actions that were taken with regard to the injured person or people.', incident.injury_actions_taken)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 5 — Property Damage
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 5 : Damage to or loss of property and equipment.')
  labelValue('a) Was property damaged or lost in this incident?:', incident.property_damage_type)
  labelValue('b) Please provide a detailed description of the property or equipment damaged or lost in the incident.', incident.property_description)
  labelValue('c) If damaged, please give a description of the nature of the damage.', incident.damage_description)
  labelValue('d) Upload a link or pictures of the damage or scene of incident.', incident.document_link || '')
  labelValue('e) Brief account of the actions that were taken to prevent the damage or loss of property or equipment.', incident.prevention_actions)
  labelValue('f) Brief account of the actions that were taken upon realisation of the damage or loss of property or equipment.', incident.post_incident_actions)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 6 — Additional Information
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 6 : Any Other Information')
  labelValue('a) Please indicate any additional comments/questions/statements you may have.', incident.additional_comments)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 7 — Notifications
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 7 : Notifications')
  checkY(20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BLACK)
  doc.text('This report was notified to the following people.', MARGIN, y)
  y += 6

  // Parse notifications list — split by newline or comma
  const notifs = (incident.notifications_list || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const labels = ['a)', 'b)', 'c)', 'd)', 'e)']
  if (notifs.length === 0) {
    labels.slice(0, 3).forEach((lbl) => {
      checkY(6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...BLACK)
      doc.text(lbl, MARGIN, y)
      y += 6
    })
  } else {
    notifs.forEach((n, i) => {
      checkY(6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...BLACK)
      doc.text(`${labels[i] || `${i + 1})`}  ${n}`, MARGIN, y)
      y += 6
    })
  }

  y += 4

  // ── Final footer on last page ────────────────────────────────────────────────
  drawFooter()

  // ── Save ─────────────────────────────────────────────────────────────────────
  const ref = incident.incident_ref || 'Report'
  doc.save(`Incident_${ref}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
