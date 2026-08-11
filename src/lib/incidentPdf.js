import { jsPDF } from 'jspdf'

/**
 * Generate Nova Pioneer branded Incident Notification Report PDF
 * Matches the original Google Form output exactly.
 */
export async function downloadIncidentPdf(incident) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PW     = 210
  const MARGIN = 18
  const CW     = PW - MARGIN * 2   // 174mm content width
  let y        = 0

  // ── Colours — matched to original PDF ──────────────────────────────────────
  const NAVY      = [10, 22, 40]
  const TITLE_BAR = [61, 63, 143]    // #3D3F8F — dark indigo/purple title bar
  const DARK_BLUE = [37, 99, 235]     // #2563EB — royal/sky blue section headers
  const DARK_GREY = [107, 114, 128]  // #6b7280 — section underlines
  const RED       = [220, 38, 38]    // #dc2626 — Incident Ref
  const BLACK     = [30, 30, 30]
  const WHITE     = [255, 255, 255]
  const LGRAY     = [240, 240, 240]
  const MGRAY     = [200, 200, 200]
  const DGRAY     = [100, 100, 100]

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).replace(',', '').toUpperCase()
  }

  const checkY = (needed = 12) => { if (y + needed > 278) newPage() }

  const newPage = () => {
    drawFooter()
    doc.addPage()
    y = MARGIN
  }

  // ── Page footer ─────────────────────────────────────────────────────────────
  const drawFooter = () => {
    const pg  = doc.internal.getCurrentPageInfo().pageNumber
    const tot = doc.internal.getNumberOfPages()
    doc.setDrawColor(...MGRAY)
    doc.setLineWidth(0.2)
    doc.line(MARGIN, 287, PW - MARGIN, 287)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...DGRAY)
    doc.text(fmtDate(incident.createdAt || new Date()), MARGIN, 292)
    doc.text(`${pg} of ${tot} / Incident No.  ${incident.incident_ref || ''}`, PW - MARGIN, 292, { align: 'right' })
  }

  // ── Section header (dark blue text + dark grey underline) ────────────────
  const sectionHeader = (title) => {
    checkY(14)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...DARK_BLUE)
    doc.text(title, MARGIN, y)
    y += 1.5
    doc.setDrawColor(...DARK_GREY)
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
    y += 6
  }

  // ── Bold question label + plain answer below ─────────────────────────────
  const labelValue = (label, value) => {
    const text  = String(value || 'N/A')
    const lines = doc.splitTextToSize(text, CW)
    const needed = 7 + lines.length * 5 + 3
    checkY(needed)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BLACK)
    const labelLines = doc.splitTextToSize(label, CW)
    labelLines.forEach((l) => { doc.text(l, MARGIN, y); y += 5 })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    lines.forEach((line) => { doc.text(line, MARGIN, y); y += 5 })
    y += 3
  }

  // ── 3-column bordered table (Section 1 reporter row) ─────────────────────
  const threeColTable = (cells) => {
    // cells: [{ label, value, w }]  w = fraction of CW
    const ROW_H = 18
    checkY(ROW_H + 2)
    let x = MARGIN
    cells.forEach(({ label, value, w }) => {
      const colW = CW * w
      doc.setDrawColor(...MGRAY)
      doc.setFillColor(...WHITE)
      doc.rect(x, y, colW, ROW_H, 'S')
      // label — small grey bold
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...DGRAY)
      doc.text(label, x + 2.5, y + 5.5)
      // value — normal black
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...BLACK)
      const vLines = doc.splitTextToSize(String(value || '—'), colW - 5)
      vLines.forEach((l, i) => doc.text(l, x + 2.5, y + 12 + i * 4.5))
      x += colW
    })
    y += ROW_H + 4
  }

  // ── 2-column bordered table (Section 2 location) ─────────────────────────
  const twoColTable = (left, right) => {
    const colW      = CW / 2
    const lLines    = doc.splitTextToSize(String(left.value  || '—'), colW - 5)
    const rLines    = doc.splitTextToSize(String(right.value || '—'), colW - 5)
    const maxLines  = Math.max(lLines.length, rLines.length)
    const H         = 8 + maxLines * 5
    checkY(H + 2)

    doc.setDrawColor(...MGRAY)
    doc.setFillColor(...WHITE)

    // left cell
    doc.rect(MARGIN, y, colW, H, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(left.label, MARGIN + 2.5, y + 5.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    lLines.forEach((l, i) => doc.text(l, MARGIN + 2.5, y + 12 + i * 5))

    // right cell
    doc.rect(MARGIN + colW, y, colW, H, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BLACK)
    doc.text(right.label, MARGIN + colW + 2.5, y + 5.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    rLines.forEach((l, i) => doc.text(l, MARGIN + colW + 2.5, y + 12 + i * 5))

    y += H + 5
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 HEADER
  // ════════════════════════════════════════════════════════════════════════════
  y = MARGIN

  // Logo — left side
  try {
    const response = await fetch('/nova-pioneer-logo.png')
    const blob     = await response.blob()
    const dataUrl  = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    // Draw contained in a 55×20 box so the shape is preserved
    doc.addImage(dataUrl, 'PNG', MARGIN, y, 55, 20, undefined, 'FAST')
  } catch {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text('NOVA PIONEER', MARGIN, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('SCHOOLS FOR INNOVATORS & LEADERS', MARGIN, y + 14)
  }

  // Right side header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...BLACK)
  doc.text('SECURITY SERVICES', PW - MARGIN, y + 6, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...RED)
  doc.text(`Incident Ref  |  ${incident.incident_ref || '—'}`, PW - MARGIN, y + 13, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...DGRAY)
  doc.text(`Report Submitted on : ${fmtDate(incident.createdAt || new Date())}`, PW - MARGIN, y + 19, { align: 'right' })

  y += 27

  // ── Title bar ───────────────────────────────────────────────────────────────
  doc.setFillColor(...TITLE_BAR)
  doc.rect(MARGIN, y, CW, 11, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...WHITE)
  doc.text('INCIDENT NOTIFICATION REPORT', PW / 2, y + 7.5, { align: 'center' })
  y += 16

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 1 — Reporter's Details
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader("Section 1 : Reporter's Details")

  threeColTable([
    { label: 'a) Report compiled by',               value: incident.reporter_name,                                 w: 0.33 },
    { label: "b) Reporter's normal duty station",   value: incident.campus_id?.name || incident.campus_name || '—', w: 0.34 },
    { label: 'c) Date and time of the incident',    value: fmtDate(incident.incident_date_time),                   w: 0.33 },
  ])

  const timingText = incident.timing_type === 'Occurred'
    ? 'This is when the incident occurred.'
    : 'This is when the incident was noticed.'
  labelValue(
    'd) Is the date and time indicated above when the incident occurred or when the incident was noticed?',
    timingText
  )
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 2 — Incident Details
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 2 : Incident Details')

  twoColTable(
    { label: 'a) Where did the incident happen?',               value: incident.incident_location_type || '—' },
    { label: 'b) What was the exact location of the incident?', value: incident.exact_location          || '—' }
  )

  labelValue('c) Brief description of the incident.', incident.description)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 3 — People Involved
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 3 : People Involved')
  labelValue('a) List the name(s) of people who were involved in or witnessed the incident.', incident.people_involved)
  labelValue('b) Briefly describe the nature of their involvement in the incident.',          incident.involvement_description)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 4 — Injuries
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 4 : Injuries')
  labelValue('a) Names of person or persons injured during the incident if any.',                      incident.injured_persons)
  labelValue('b) Brief description of the nature of the injury or injuries.',                          incident.injury_description)
  labelValue('c) Brief account of the actions that were taken with regard to the injured person or people.', incident.injury_actions_taken)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 5 — Property Damage
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 5 : Damage to or loss of property and equipment.')
  labelValue('a) Was property damaged or lost in this incident?:',                                                                  incident.property_damage_type)
  labelValue('b) Please provide a detailed description of the property or equipment damaged or lost in the incident.',              incident.property_description)
  labelValue('c) If damaged, please give a description of the nature of the damage.',                                               incident.damage_description)
  labelValue('d) Upload a link  or pictures of the damage or scene of incident.',                                                   incident.document_link || incident.damage_link || '')
  labelValue('e) Brief account of the actions that were taken to prevent the damage or loss of property or equipment.',             incident.prevention_actions)
  labelValue('f) Brief account of the actions that were taken upon realisation of the damage or loss of property or equipment.',    incident.post_incident_actions)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 6 — Any Other Information
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 6 : Any Other Information')
  labelValue('a) Please indicate any additional comments/questions/statements you may have.', incident.additional_comments)
  rule()

  // ════════════════════════════════════════════════════════════════════════════
  // SECTION 7 — Notifications
  // ════════════════════════════════════════════════════════════════════════════
  sectionHeader('Section 7 : Notifications')
  checkY(8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BLACK)
  doc.text('This report was notified to the following people.', MARGIN, y)
  y += 7

  const notifs = (incident.notifications_list || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const notifLabels = ['a)', 'b)', 'c)', 'd)', 'e)']
  const rows = notifs.length > 0 ? notifs : ['', '', '']   // always show at least 3 rows
  rows.forEach((n, i) => {
    checkY(6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...BLACK)
    doc.text(`${notifLabels[i] || `${i + 1})`}${n ? '  ' + n : ''}`, MARGIN, y)
    y += 7
  })

  y += 4

  // ── Final footer on last page ────────────────────────────────────────────────
  drawFooter()

  // ── Save ─────────────────────────────────────────────────────────────────────
  const ref = incident.incident_ref || 'Report'
  doc.save(`Incident_${ref}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
