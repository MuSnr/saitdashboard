import { jsPDF } from 'jspdf'

const v = (val) => (val && String(val).trim()) ? String(val).trim() : ''

// ── Draw a labeled field line ──────────────────────────────────────────────
function fieldLine(doc, label, value, x, y, w) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(40, 40, 40)
  doc.text(label, x, y)
  const lw = doc.getTextWidth(label) + 1
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(20, 20, 20)
  const val = v(value)
  if (val) doc.text(val, x + lw, y)
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.2)
  doc.line(x + lw, y + 0.8, x + w, y + 0.8)
}

// ── Draw a full-width answer line with dots ────────────────────────────────
function answerLine(doc, label, value, x, y, contentW, lineH = 6) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(40, 40, 40)
  const labelLines = doc.splitTextToSize(label, contentW)
  labelLines.forEach((l, i) => doc.text(l, x, y + i * 5))
  const afterLabel = y + labelLines.length * 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(20, 20, 20)
  const val = v(value)
  if (val) {
    const valLines = doc.splitTextToSize(val, contentW)
    valLines.forEach((l, i) => doc.text(l, x, afterLabel + i * 5))
    return afterLabel + valLines.length * 5 + 2
  }
  // blank line
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.2)
  doc.line(x, afterLabel + lineH, x + contentW, afterLabel + lineH)
  return afterLabel + lineH + 3
}

// ── Section header ─────────────────────────────────────────────────────────
function sectionLabel(doc, text, x, y, contentW) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(text, x, y)
  return y + 5
}

// ── Items table (page 2 of GA/Mayfair) ────────────────────────────────────
function drawItemsTable(doc, items, x, y, contentW) {
  const cols = [55, 30, 22, 30, 28, 28]  // widths
  const headers = ['Full description\nof Property', 'Where and when\nAcquired.', 'Cost Price',
                   'Deduction of\nwear, Tear and\nDepreciation', 'Amount allowed\nfor Salvage', 'Amount Claimed']
  const rowH = 8
  const headerH = 16

  // Header
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.3)
  let cx = x
  headers.forEach((h, i) => {
    doc.rect(cx, y, cols[i], headerH, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(30, 30, 30)
    const lines = h.split('\n')
    lines.forEach((l, li) => doc.text(l, cx + 1.5, y + 5 + li * 4))
    cx += cols[i]
  })
  y += headerH

  // Rows (min 6 rows)
  const rows = items && items.length > 0 ? items : Array(6).fill({})
  rows.forEach((item) => {
    cx = x
    const rowData = [
      item.description || '', item.where_acquired || '', item.cost_price || '',
      item.depreciation || '', item.salvage || '', item.amount_claimed || '',
    ]
    rowData.forEach((cell, i) => {
      doc.rect(cx, y, cols[i], rowH * 2, 'S')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(20, 20, 20)
      if (cell) doc.text(cell, cx + 1.5, y + 5)
      cx += cols[i]
    })
    y += rowH * 2
  })
  return y + 4
}

// ══════════════════════════════════════════════════════════════════════════════
// GA INSURANCE — Kenya
// ══════════════════════════════════════════════════════════════════════════════
function generateGA(doc, p, sig) {
  const M = 15, PW = 210, CW = PW - M * 2
  let y = 12

  // Header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 30, 30)
  doc.text('GA INSURANCE LIMITED', PW - M, y, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60)
  doc.text('GA Insurance House, Ralph Bunche Road, P O Box 42166 - 00100 Nairobi, Kenya.', PW - M, y + 4.5, { align: 'right' })
  doc.text('Telephone: 2711633  Fax 2714542  E-mail: insurer@gakenya.com', PW - M, y + 8.5, { align: 'right' })
  y += 16

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20, 20, 20)
  doc.text('NAME AND ADDRESS OF THE INSURER', M, y)
  y += 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
  doc.text('CLAIM FORM FOR PROPERTY DAMAGE OR LOSS', M, y)
  y += 4
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(60, 60, 60)
  doc.text('(Applicable to Fire, Special Perils, "Home" Covers, Theft, All Risks, Money, Baggage and Glass)', M, y)
  y += 5
  doc.text('The issue of this form is not an admission of liability on the part of the Company.', M, y); y += 4
  doc.text('All questions on this form must be answered in full.', M, y); y += 7

  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.3)
  doc.line(M, y, M + CW, y); y += 5

  // Policy row
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30)
  doc.text('Policy No.', M, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(v(p.policy_no), M + 18, y)
  doc.text('1.  RENEWAL DATE', M + 65, y)
  doc.setFont('helvetica', 'normal')
  doc.text(v(p.renewal_date), M + 95, y)
  doc.text('Date of Payment of Last Premium:', M + 130, y)
  doc.setFont('helvetica', 'normal')
  doc.text(v(p.last_premium_date), M + 185, y)
  y += 8

  // Insured table
  const tableX = M + 32, tableW = CW - 32
  const rows2 = [
    ['2', `Name: ${v(p.insured_name)}`],
    ['3', `Address: ${v(p.insured_address)}    Telephone No. ${v(p.insured_telephone)}`],
    ['', `Business or Occupation: ${v(p.business_occupation)}`],
    ['', `Email address: ${v(p.insured_email)}    PIN no. ${v(p.insured_pin)}`],
  ]
  doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.2)
  doc.rect(M, y - 2, 30, rows2.length * 7 + 2, 'S')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(50, 50, 50)
  doc.text('Insured', M + 2, y + 3)
  rows2.forEach(([num, text]) => {
    if (num) { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(num, tableX - 8, y + 4) }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20)
    doc.text(text, tableX, y + 4)
    doc.line(M, y + 7, M + CW, y + 7)
    y += 7
  })
  y += 4
  return y
}

function generateGABody(doc, p, y) {
  const M = 15, PW = 210, CW = PW - M * 2

  const qa = (num, label, value) => {
    if (y > 265) { doc.addPage(); y = 15 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(50, 50, 50)
    doc.text(`${num}`, M + 32, y + 4)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20)
    const lines = doc.splitTextToSize(`${label}  ${v(value)}`, CW - 42)
    lines.forEach((l, i) => doc.text(l, M + 40, y + 4 + i * 5))
    doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.2)
    doc.line(M, y + 4 + Math.max(lines.length - 1, 0) * 5 + 3, M + CW, y + 4 + Math.max(lines.length - 1, 0) * 5 + 3)
    y += Math.max(lines.length, 1) * 5 + 4
  }

  // Section labels
  const sLabel = (text, nums) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(80, 80, 80)
    doc.text(text, M, y + 4)
    return y
  }

  // Circumstances
  sLabel('Circumstances\ngiving rise to\nClaim', [5,6,7]); y += 2
  qa('5', 'Date and time of loss:', p.loss_date_time)
  qa('6', 'Where loss or damage occurred:', p.loss_location)
  qa('7', 'Describe fully how loss or damage occurred:', p.loss_description)

  // General Information
  sLabel('General\nInformation', [8,9,10,11,12,13,14,15,16])
  qa('8',  'Type of premises involved:', p.premises_type)
  qa('9',  'Were the premises unoccupied? Yes/No. If so, when were they last occupied?', p.premises_unoccupied)
  qa('10', 'Are the premises self-contained? If not, name of other occupants:', p.premises_self_contained)
  qa('11', 'Are you owner of premises?', p.owner_of_premises)
  qa('12', 'Are you responsible for repairs?', p.responsible_repairs)
  qa('13', 'Have you any suspicion as to parties implicated?', p.suspicion_parties)
  qa('14', 'Is there any other insurance in force providing covers for this loss? If so, give particulars including Insurers name, address and Policy No:', p.other_insurance)
  qa('15', 'Have you ever suffered similar loss or damage? If so, give particulars and whether claim was made on Insurers:', p.previous_loss)
  qa('16', `At the time of the loss what was the value of: (a) The buildings? ${v(p.value_buildings)}  (b) All the property in the premises? ${v(p.value_property)}`, '')

  // Theft section
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(50, 50, 50)
  if (y > 250) { doc.addPage(); y = 15 }
  doc.text('Complete in all Cases involving THEFT / MALICIOUS DAMAGE / OR MISSING ARTICLES', M, y + 4); y += 8
  qa('17', 'When were Police notified?', p.police_notified_date)
  qa('18', 'Address of Police Station:', p.police_station)
  qa('19', 'What other steps have you taken to recover property?', p.recovery_steps)
  qa('20', 'Give full details of method of entry to premises:', p.entry_method)
  qa('21', 'If alarm fitted, did it function properly? If not, give reasons:', p.alarm_functional)
  qa('22', 'Are guards employed? If so, name of firm:', p.guards_employed)

  // Transit section
  if (y > 250) { doc.addPage(); y = 15 }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(50, 50, 50)
  doc.text('Complete in all Cases involving Loss in Transit', M, y + 4); y += 8
  qa('23', 'Starting point and destination of transit:', p.transit_route)
  qa('24', 'Who was accompanying property lost?', p.transit_accompanying)
  qa('25', 'If employees, state age and duties:', p.transit_employee_details)
  qa('26', 'Are they insured under Fidelity Guarantee Policy? If so, Insurers name address and Policy No.:', p.fidelity_guarantee)
  qa('27', 'How often is this transit made?', p.transit_frequency)
  qa('28', 'What is maximum ever carried at one time?', p.transit_max_carried)

  // Amount
  if (y > 260) { doc.addPage(); y = 15 }
  qa('29', 'Amount claimed Kenya Shillings:', p.amount_claimed)

  return y
}

function generateSignatureAndDeclaration(doc, p, sig, insurer) {
  const M = 15, PW = 210, CW = PW - M * 2
  let y = doc.internal.getCurrentPageInfo().pageNumber > 1 ? 260 : null
  // Check space on current page
  const curY = doc._currentPage ? 260 : 260
  if (!y) y = curY

  doc.addPage()
  y = 15

  // Declaration text
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(30, 30, 30)
  const decl = insurer === 'TWK'
    ? 'I/We hereby declare that I/we have suffered a loss or damage to the property enumerated on the reverse hereof and that the said property was in my/our possession immediately prior to the said loss/damage which occurred in the circumstances described above.'
    : 'I/We declare that I/We have not withheld any material information and that all statements made on this form are true to the best of my/our knowledge and belief and that articles and property described overleaf belong to me/us, and that no other person has any interest whether as owner, Mortgagee, Trustee or otherwise except as mentioned in this policy.'
  const declLines = doc.splitTextToSize(decl, CW)
  declLines.forEach((l) => { doc.text(l, M, y); y += 5 })
  y += 4

  // Signature box
  doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.3)
  doc.rect(M, y, 80, 35, 'S')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(60, 60, 60)
  doc.text('Signature of Insured:', M + 2, y + 5)
  if (sig) {
    try { doc.addImage(sig, 'PNG', M + 2, y + 7, 76, 24) } catch {}
  }
  doc.line(M + 2, y + 32, M + 78, y + 32)

  // Date and signed by
  doc.text('Date:', M + 90, y + 10)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(v(p.signed_date), M + 103, y + 10)
  doc.setDrawColor(150, 150, 150); doc.line(M + 100, y + 10.5, M + CW, y + 10.5)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8)
  doc.text('Name (Print):', M + 90, y + 20)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(v(p.signed_by), M + 115, y + 20)
  doc.line(M + 113, y + 20.5, M + CW, y + 20.5)

  y += 40

  // Items table title
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(20, 20, 20)
  doc.text('DETAILS OF AMOUNT CLAIMED', M, y); y += 5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
  doc.setTextColor(50, 50, 50)
  const instrLines = doc.splitTextToSize(
    'If claim is for repairable damage, give particulars of damage and a tradesman\'s estimate for the repairs necessary. If claim is for irreparable damage or loss, list items below completing all columns. In cases where reported to Police please furnish a Police report.',
    CW)
  instrLines.forEach((l) => { doc.text(l, M, y); y += 4.5 })
  y += 3

  drawItemsTable(doc, p.items || [], M, y, CW)
}

// ══════════════════════════════════════════════════════════════════════════════
// TWK — South Africa (bilingual EN/AF)
// ══════════════════════════════════════════════════════════════════════════════
function generateTWK(doc, p, sig) {
  const M = 15, PW = 210, CW = PW - M * 2
  let y = 12

  // Title
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(20, 20, 20)
  doc.text('Property Loss claim form', M, y); y += 6
  doc.text('Eiendomsverlies eisvorm', M, y); y += 10

  const row = (enLabel, afLabel, value) => {
    if (y > 268) { doc.addPage(); y = 15 }
    doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.2)
    doc.rect(M, y, CW * 0.38, 9, 'S')
    doc.rect(M + CW * 0.38, y, CW * 0.39, 9, 'S')
    doc.rect(M + CW * 0.77, y, CW * 0.23, 9, 'S')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(40, 40, 40)
    doc.text(enLabel, M + 1.5, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20)
    if (value) doc.text(v(value), M + CW * 0.38 + 1.5, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100)
    doc.text(afLabel, M + CW * 0.77 + 1.5, y + 6)
    y += 9
  }

  const sectionRow = (text, afText) => {
    if (y > 268) { doc.addPage(); y = 15 }
    doc.setFillColor(220, 240, 220)
    doc.rect(M, y, CW, 8, 'F')
    doc.setDrawColor(150, 180, 150); doc.setLineWidth(0.2)
    doc.rect(M, y, CW, 8, 'S')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(20, 80, 20)
    doc.text(text, M + 2, y + 5.5)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 100, 60)
    doc.text(afText, M + CW - 2, y + 5.5, { align: 'right' })
    y += 8
  }

  // Policy Info
  row('Insurer', 'Versekeraar', 'TWK')
  row('Policy number', 'Polisnommer', p.policy_no)
  row('', '', '')
  row('Name', 'Naam', p.insured_name)
  row('Identity number/VAT Nr', 'Identiteitsnommer/VAT No', p.identity_number)
  row('Contact number', 'Kontak Nommer', p.contact_number)

  sectionRow('Loss or Damages', 'Verlies of Skade')
  row('Date', 'Datum', p.loss_date_time)
  row('When was loss discovered?', 'Wanneer was verlies ontdek?', p.when_loss_discovered)
  row('Value of Loss', 'Waarde van verlies', p.amount_claimed)

  row('Address', 'Adres', p.insured_address)
  row('Were the premises occupied?', 'Was perseel bewoon?', p.premises_unoccupied)
  row('By whom?', 'Deur wie?', p.premises_self_contained)
  row('If unoccupied, when last was it occupied?', 'Indien onbewoon, wanneer laas bewoon?', '')
  row('Purpose of occupation', 'Doel van gebruik van perseel', p.business_occupation)

  sectionRow('Cause of Loss', 'Oorsaak van Skade')
  // Circumstances — multi-row
  doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.2)
  doc.rect(M, y, CW * 0.38, 30, 'S')
  doc.rect(M + CW * 0.38, y, CW * 0.39, 30, 'S')
  doc.rect(M + CW * 0.77, y, CW * 0.23, 30, 'S')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(40, 40, 40)
  doc.text('Circumstances', M + 1.5, y + 5)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(20, 20, 20)
  if (p.loss_description) {
    const lines = doc.splitTextToSize(v(p.loss_description), CW * 0.38)
    lines.slice(0, 5).forEach((l, i) => doc.text(l, M + CW * 0.38 + 1.5, y + 5 + i * 5))
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 100, 100)
  doc.text('Omstandighede', M + CW * 0.77 + 1.5, y + 5)
  y += 30

  row('Was alarm activated?', 'Was alarm geaktiveer?', p.alarm_activated)
  row('If damages/loss was caused by another party, give name and address', 'Indien skade deur \'n ander persoon veroorsaak is, meld naam en adres', p.third_party_name)

  sectionRow('Previous Loss', 'Vorige verliese')
  row('Previous Damages/loss suffered?', 'Het u vorige verliese/skade gely?', p.previous_loss)

  // Page 2 equivalent
  doc.addPage(); y = 15
  row('Name of Insurer', 'Naam van Versekeraar', p.insured_name)
  sectionRow('Police details', 'Polisiebesonderhede')
  row('Date, time, place', 'Datum, tyd, plek', p.loss_date_time)
  row('Police details', 'Polisiebesonderhede', p.police_station)
  row('Date Reported & by whom', 'Datum gerapporteer en deur wie', p.police_notified_date)

  sectionRow('Other Interest', 'Ander belange')
  row('Does any other party have an interest in the property ex. Lease Agreement or Homeloan', 'Huurkoop- of Kredietooreenkoms', p.other_party_interest)
  row('Any other insurance covering this loss/damage?', 'Enige ander versekering wat hierdie verlies/skade dek?', p.other_insurance)

  sectionRow('Value of Property', 'Waarde van Eiendom')
  row('Total value of all property insured', 'Totale waarde van alle eiendom verseker', p.total_value_insured)
  row('When last was this valuated?', 'Wanneer laas is dit gewaardeer?', p.last_valuated)
  y += 5

  // Declaration
  doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.2)
  doc.rect(M, y, CW, 20, 'S')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(30, 30, 30)
  const declEN = doc.splitTextToSize('I/We hereby declare that I/we have suffered a loss or damage to the property enumerated on the reverse hereof and that the said property was in my/our possession immediately prior to the said loss/damage which occurred in the circumstances described above.', CW - 4)
  declEN.forEach((l, i) => doc.text(l, M + 2, y + 5 + i * 4))
  y += 22

  // Signature
  doc.rect(M, y, 80, 35, 'S')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(60, 60, 60)
  doc.text('Signature of insured / Handtekening van versekerde:', M + 2, y + 5)
  if (sig) { try { doc.addImage(sig, 'PNG', M + 2, y + 7, 76, 24) } catch {} }
  doc.line(M + 2, y + 32, M + 78, y + 32)
  doc.text('Date/Datum:', M + 90, y + 10)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(v(p.signed_date), M + 115, y + 10)
  doc.line(M + 112, y + 10.5, M + CW, y + 10.5)
  y += 42

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80)
  doc.text('TWK Agri is an authorised Financial Services Provider (FSP45055) / TWK Agri is \'n gemagtigde Finansiële Dienste Verskaffer (FDV45055)', PW / 2, y, { align: 'center' })
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export function downloadClaimPackPdf(insurer, packData, claimId) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const p   = packData || {}
  const sig = p.signature_data_url || null

  if (insurer === 'TWK') {
    generateTWK(doc, p, sig)
  } else {
    // GA Insurance and Mayfair use the same structure
    let y = generateGA(doc, p, sig)
    y = generateGABody(doc, p, y)
    generateSignatureAndDeclaration(doc, p, sig, insurer)
  }

  const name = insurer.replace(/\s+/g, '_')
  doc.save(`ClaimPack_${name}_${claimId}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
