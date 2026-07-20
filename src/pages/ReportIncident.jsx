import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { api } from '@/services/api'

const CAMPUSES_ZA = ['Ruimsig', 'Paulshof', 'Midrand', 'Boksburg', 'North Riding']
const CAMPUSES_KE = [
  'Network', 'Tatu Boys', 'Tatu Girls', 'Tatu Primary', 'Athi Primary',
  'Eldoret Boys', 'Eldoret Girls', 'Tatu Shared', 'Tatu International', 'Eldoret Primary',
]

const INCIDENT_TYPES  = ['Theft','Accidental Damage','Natural Disaster','Fire','Power Surge','Other']
const LOCATION_TYPES  = ['On NP Property','Other (select this option if the incident happened outside an NP property)']
const DAMAGE_TYPES    = ['None','Damaged','Lost property / equipment','Both Damaged & Lost']

const blank = {
  reporter_name:'', reporter_email:'', campus_name:'',
  incident_date_time:'', timing_type:'Occurred',
  incident_type:'Theft', description:'',
  incident_location_type:'On NP Property', exact_location:'',
  duty_station_detail:'',
  people_involved:'', involvement_description:'',
  injured_persons:'', injury_description:'', injury_actions_taken:'',
  property_damage_type:'None', property_description:'', damage_description:'',
  damage_link:'',
  prevention_actions:'', post_incident_actions:'',
  additional_comments:'',
  notifications_list:'',
}

// Section header styled like the original (orange bold)
function SectionHeader({ num, title }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b-2 border-orange-500 mb-4">
      <h3 className="font-bold text-orange-600 text-base">{`Section ${num} : ${title}`}</h3>
    </div>
  )
}

export default function ReportIncident() {
  const { region } = useParams()  // 'ke' | 'za' | undefined (shows all)

  // Determine which campuses to show based on URL
  const isKE = region === 'ke'
  const isZA = region === 'za'
  const CAMPUSES = isKE ? CAMPUSES_KE : isZA ? CAMPUSES_ZA : [...CAMPUSES_ZA, ...CAMPUSES_KE].sort()
  const regionLabel = isKE ? 'Kenya' : isZA ? 'South Africa' : ''
  const [form, setForm]           = useState(blank)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [refNumber, setRefNumber]   = useState('')
  const [error, setError]           = useState('')

  const set  = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const setV = (k) => (v) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.reporter_name || !form.reporter_email || !form.campus_name ||
        !form.incident_date_time || !form.description || !form.incident_type) {
      setError('Please fill in all required fields (marked with *).'); return
    }
    setError(''); setSubmitting(true)
    try {
      const res = await api.post('/incidents/public', {
        reporter_name:          form.reporter_name,
        reporter_email:         form.reporter_email,
        campus_name:            form.campus_name,
        incident_date_time:     form.incident_date_time,
        timing_type:            form.timing_type,
        incident_type:          form.incident_type,
        description:            form.description,
        duty_station_detail:    form.duty_station_detail,
        incident_location_type: form.incident_location_type,
        exact_location:         form.exact_location,
        people_involved:        form.people_involved,
        involvement_description:form.involvement_description,
        injured_persons:        form.injured_persons,
        injury_description:     form.injury_description,
        injury_actions_taken:   form.injury_actions_taken,
        property_damage_type:   form.property_damage_type,
        property_description:   form.property_description,
        damage_description:     form.damage_description,
        prevention_actions:     form.prevention_actions,
        post_incident_actions:  form.post_incident_actions,
        additional_comments:    form.additional_comments,
        notifications_list:     form.notifications_list,
      })
      setRefNumber(res.data?.incident?.incident_ref || '')
      setSubmitted(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Submission failed. Please try again.')
    } finally { setSubmitting(false) }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={36} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Report Submitted</h2>
            {refNumber && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Your reference number</p>
                <p className="text-2xl font-mono font-bold text-orange-600">{refNumber}</p>
                <p className="text-xs text-gray-400 mt-1">Please keep this for your records</p>
              </div>
            )}
            <p className="text-sm text-gray-500">Your incident report has been received and will be reviewed by the Security Services team.</p>
            <Button onClick={() => { setForm(blank); setSubmitted(false) }} variant="outline" className="w-full">Submit Another Report</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-0">

        {/* ── Header — matches original exactly ─────────────────────────── */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
          {/* Logo left — Nova Pioneer official logo */}
          <div className="flex items-center">
            <img src="/nova-pioneer-logo.png" alt="Nova Pioneer" className="h-16 w-auto" />
          </div>
          {/* Right header */}
          <div className="text-right">
            <p className="font-bold text-xl text-gray-900">SECURITY SERVICES</p>
            {regionLabel && (
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 mb-0.5 ${
                isKE ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {regionLabel} Region
              </span>
            )}
            <p className="font-bold text-base text-orange-600 mt-0.5">Incident Ref | —</p>            <p className="text-xs text-gray-500 mt-0.5">
              Report Submitted on : {new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }).replace(/ /g,'-')} {new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', hour12:true }).toUpperCase()}
            </p>
          </div>
        </div>

        {/* ── Title bar ─────────────────────────────────────────────────────── */}
        <div className="bg-[#3C3C64] text-white text-center font-bold text-lg py-3 mb-6 rounded-sm">
          INCIDENT NOTIFICATION REPORT
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* ── Section 1 — Reporter's Details ──────────────────────────────── */}
          <div>
            <SectionHeader num="1" title="Reporter's Details" />

            {/* 3-column bordered table like original */}
            <div className="grid grid-cols-3 border border-gray-300 mb-4">
              {[
                { label: 'a) Report compiled by', key: 'reporter_name', placeholder: 'Full Name', required: true },
                { label: "b) Reporter's normal duty station", key: 'campus_name', isSelect: true },
                { label: 'c) Date and time of the incident', key: 'incident_date_time', type: 'datetime-local', required: true },
              ].map(({ label, key, placeholder, required, type, isSelect }, i) => (
                <div key={key} className={`p-3 ${i < 2 ? 'border-r border-gray-300' : ''}`}>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">{label}</p>
                  {isSelect ? (
                    <Select value={form[key]} onValueChange={setV(key)}>
                      <SelectTrigger className="h-8 text-sm border-0 border-b border-gray-300 rounded-none px-0 focus:ring-0">
                        <SelectValue placeholder="Select campus" />
                      </SelectTrigger>
                      <SelectContent>{CAMPUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={type || 'text'}
                      value={form[key]}
                      onChange={set(key)}
                      placeholder={placeholder}
                      required={required}
                      className="h-8 text-sm border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2 mt-5">
              <p className="text-sm font-bold text-gray-800">
                d) Is the date and time indicated above when the incident occurred or when the incident was noticed?
              </p>
              <Select value={form.timing_type} onValueChange={setV('timing_type')}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Occurred">This is when the incident occurred.</SelectItem>
                  <SelectItem value="Noticed">This is when the incident was noticed.</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* ── Section 2 — Incident Details ────────────────────────────────── */}
          <div>
            <SectionHeader num="2" title="Incident Details" />

            {/* 2-column bordered table for location */}
            <div className="grid grid-cols-2 border border-gray-300 mb-4">
              <div className="p-3 border-r border-gray-300">
                <p className="text-xs font-semibold text-gray-600 mb-1.5">a) Where did the incident happen?</p>
                <Select value={form.incident_location_type} onValueChange={setV('incident_location_type')}>
                  <SelectTrigger className="h-8 text-sm border-0 border-b border-gray-300 rounded-none px-0 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((l) => <SelectItem key={l} value={l}><span className="text-xs">{l}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-gray-600 mb-1.5">b) What was the exact location of the incident?</p>
                <Input value={form.exact_location} onChange={set('exact_location')} placeholder="e.g. Nairobi CBD" className="h-8 text-sm border-0 border-b border-gray-300 rounded-none px-0 focus-visible:ring-0" />
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-sm font-bold text-gray-800">Type of Incident *</p>
              <Select value={form.incident_type} onValueChange={setV('incident_type')}>
                <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2 mt-5">
              <p className="text-sm font-bold text-gray-800">c) Brief description of the incident. *</p>
              <Textarea value={form.description} onChange={set('description')} rows={5} placeholder="Describe what happened in detail…" required className="text-sm" />
            </div>
          </div>

          <Separator />

          {/* ── Section 3 — People Involved ─────────────────────────────────── */}
          <div>
            <SectionHeader num="3" title="People Involved" />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">a) List the name(s) of people who were involved in or witnessed the incident.</p>
                <Textarea value={form.people_involved} onChange={set('people_involved')} rows={2} placeholder="Names of witnesses, involved parties…" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">b) Briefly describe the nature of their involvement in the incident.</p>
                <Textarea value={form.involvement_description} onChange={set('involvement_description')} rows={2} placeholder="How were they involved?" className="text-sm" />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section 4 — Injuries ────────────────────────────────────────── */}
          <div>
            <SectionHeader num="4" title="Injuries" />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">a) Names of person or persons injured during the incident if any.</p>
                <Input value={form.injured_persons} onChange={set('injured_persons')} placeholder="N/A if no injuries" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">b) Brief description of the nature of the injury or injuries.</p>
                <Textarea value={form.injury_description} onChange={set('injury_description')} rows={2} placeholder="N/A if no injuries" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">c) Brief account of the actions that were taken with regard to the injured person or people.</p>
                <Textarea value={form.injury_actions_taken} onChange={set('injury_actions_taken')} rows={2} placeholder="First aid, hospital referral, etc." className="text-sm" />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section 5 — Property Damage ─────────────────────────────────── */}
          <div>
            <SectionHeader num="5" title="Damage to or loss of property and equipment." />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">a) Was property damaged or lost in this incident?:</p>
                <Select value={form.property_damage_type} onValueChange={setV('property_damage_type')}>
                  <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{DAMAGE_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">b) Please provide a detailed description of the property or equipment damaged or lost in the incident.</p>
                <Textarea value={form.property_description} onChange={set('property_description')} rows={2} placeholder="List items with serial numbers if known…" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">c) If damaged, please give a description of the nature of the damage.</p>
                <Textarea value={form.damage_description} onChange={set('damage_description')} rows={2} placeholder="N/A if not applicable" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">d) Upload a link or pictures of the damage or scene of incident.</p>
                <Input value={form.damage_link} onChange={set('damage_link')} placeholder="Paste a Google Drive or image link" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">e) Brief account of the actions that were taken to prevent the damage or loss of property or equipment.</p>
                <Textarea value={form.prevention_actions} onChange={set('prevention_actions')} rows={2} placeholder="Actions taken to prevent further loss…" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-gray-800">f) Brief account of the actions that were taken upon realisation of the damage or loss of property or equipment.</p>
                <Textarea value={form.post_incident_actions} onChange={set('post_incident_actions')} rows={2} placeholder="What did you do when you discovered the damage/loss?" className="text-sm" />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section 6 — Additional Information ──────────────────────────── */}
          <div>
            <SectionHeader num="6" title="Any Other Information" />
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-gray-800">a) Please indicate any additional comments/questions/statements you may have.</p>
              <Textarea value={form.additional_comments} onChange={set('additional_comments')} rows={3} className="text-sm" />
            </div>
          </div>

          <Separator />

          {/* ── Section 7 — Notifications ────────────────────────────────────── */}
          <div>
            <SectionHeader num="7" title="Notifications" />
            <p className="text-sm text-gray-600 mb-3">This report was notified to the following people.</p>
            <div className="space-y-1.5">
              <p className="text-sm font-bold text-gray-800">a), b), c) Names of people notified (one per line)</p>
              <Textarea
                value={form.notifications_list}
                onChange={set('notifications_list')}
                rows={3}
                placeholder={"a) Campus Principal\nb) HR Manager\nc) Security"}
                className="text-sm font-mono"
              />
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-semibold bg-[#0A1628] hover:bg-[#1a2f50]">
            {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting Report…</> : 'Submit Incident Report'}
          </Button>

          <p className="text-center text-xs text-gray-400 pb-4">
            © 2026 Nova Pioneer Schools for Innovators &amp; Leaders · All submissions are confidential
          </p>
        </form>
      </div>
    </div>
  )
}
