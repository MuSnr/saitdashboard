import { useState } from 'react'
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
const ALL_CAMPUSES = [...CAMPUSES_ZA, ...CAMPUSES_KE].sort()
const INCIDENT_TYPES = ['Theft', 'Accidental Damage', 'Natural Disaster', 'Fire', 'Power Surge', 'Other']
const TIMING_TYPES   = ['Occurred', 'Noticed']
const LOCATION_TYPES = ['On NP Property', 'Outside NP Property']
const DAMAGE_TYPES   = ['None', 'Damaged', 'Lost property / equipment', 'Both Damaged & Lost']

const blank = {
  reporter_name: '', reporter_email: '', campus_name: '',
  incident_date_time: '', timing_type: 'Occurred',
  incident_type: 'Theft', description: '',
  incident_location_type: 'On NP Property', exact_location: '',
  duty_station_detail: '',
  people_involved: '', involvement_description: '',
  injured_persons: '', injury_description: '', injury_actions_taken: '',
  property_damage_type: 'None', property_description: '', damage_description: '',
  prevention_actions: '', post_incident_actions: '',
  additional_comments: '',
  notifications_list: '',
}

export default function ReportIncident() {
  const [form, setForm]         = useState(blank)
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
      setError('Please fill in all required fields.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      // Find campus_id by name via public endpoint
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
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={36} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-nova-navy">Report Submitted</h2>
            {refNumber && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Your reference number</p>
                <p className="text-2xl font-mono font-bold text-nova-navy">{refNumber}</p>
                <p className="text-xs text-gray-400 mt-1">Please keep this for your records</p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Your incident report has been received and will be reviewed by the Nova Pioneer team. You will be contacted if further information is required.
            </p>
            <Button onClick={() => { setForm(blank); setSubmitted(false); setRefNumber('') }} variant="outline" className="w-full">
              Submit Another Report
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-nova-navy rounded-xl flex items-center justify-center font-bold text-nova-green text-base shadow-sm">NP</div>
            <div className="text-left">
              <p className="font-bold text-nova-navy text-lg leading-none">Nova Pioneer Schools</p>
              <p className="text-xs text-gray-500 mt-0.5">Incident Notification Form</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            Use this form to report any incident. No login is required. All submissions are confidential and reviewed by management.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Section 1 — Reporter */}
          <Card><CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-nova-navy text-white text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
              <h3 className="font-semibold text-nova-navy">Reporter Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.reporter_name} onChange={set('reporter_name')} placeholder="Your full name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Email Address *</Label>
                <Input type="email" value={form.reporter_email} onChange={set('reporter_email')} placeholder="your@email.com" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Campus / Duty Station *</Label>
                <Select value={form.campus_name} onValueChange={setV('campus_name')}>
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>{ALL_CAMPUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Specific Location / Department</Label>
                <Input value={form.duty_station_detail} onChange={set('duty_station_detail')} placeholder="e.g. Grade 4 Block, Admin Office" />
              </div>
            </div>
          </CardContent></Card>

          {/* Section 2 — Incident Details */}
          <Card><CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-nova-navy text-white text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
              <h3 className="font-semibold text-nova-navy">Incident Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date & Time *</Label>
                <Input type="datetime-local" value={form.incident_date_time} onChange={set('incident_date_time')} required />
              </div>
              <div className="space-y-1.5">
                <Label>Was this when it occurred or noticed?</Label>
                <Select value={form.timing_type} onValueChange={setV('timing_type')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type of Incident *</Label>
                <Select value={form.incident_type} onValueChange={setV('incident_type')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Location Type</Label>
                <Select value={form.incident_location_type} onValueChange={setV('incident_location_type')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LOCATION_TYPES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Exact Location</Label>
              <Input value={form.exact_location} onChange={set('exact_location')} placeholder="e.g. Server room, Parking lot B" />
            </div>
            <div className="space-y-1.5">
              <Label>Brief Description of Incident *</Label>
              <Textarea value={form.description} onChange={set('description')} rows={3} placeholder="Describe what happened in detail…" required />
            </div>
          </CardContent></Card>

          {/* Section 3 — People Involved */}
          <Card><CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-nova-navy text-white text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
              <h3 className="font-semibold text-nova-navy">People Involved</h3>
            </div>
            <div className="space-y-1.5">
              <Label>Names of people involved (witnesses, staff, students)</Label>
              <Textarea value={form.people_involved} onChange={set('people_involved')} rows={2} placeholder="List names and their roles…" />
            </div>
            <div className="space-y-1.5">
              <Label>Nature of their involvement</Label>
              <Textarea value={form.involvement_description} onChange={set('involvement_description')} rows={2} placeholder="Describe how each person was involved…" />
            </div>
          </CardContent></Card>

          {/* Section 4 — Injuries */}
          <Card><CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-nova-navy text-white text-xs flex items-center justify-center font-bold flex-shrink-0">4</span>
              <h3 className="font-semibold text-nova-navy">Injuries</h3>
            </div>
            <div className="space-y-1.5">
              <Label>Names of injured persons (if any)</Label>
              <Input value={form.injured_persons} onChange={set('injured_persons')} placeholder="Leave blank if no injuries" />
            </div>
            <div className="space-y-1.5">
              <Label>Description of injuries</Label>
              <Textarea value={form.injury_description} onChange={set('injury_description')} rows={2} placeholder="Nature and extent of injuries…" />
            </div>
            <div className="space-y-1.5">
              <Label>Actions taken (first aid, hospital, etc.)</Label>
              <Textarea value={form.injury_actions_taken} onChange={set('injury_actions_taken')} rows={2} placeholder="What was done immediately after…" />
            </div>
          </CardContent></Card>

          {/* Section 5 — Property Damage */}
          <Card><CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-nova-navy text-white text-xs flex items-center justify-center font-bold flex-shrink-0">5</span>
              <h3 className="font-semibold text-nova-navy">Property Damage / Loss</h3>
            </div>
            <div className="space-y-1.5">
              <Label>Type of property damage</Label>
              <Select value={form.property_damage_type} onValueChange={setV('property_damage_type')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAMAGE_TYPES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.property_damage_type !== 'None' && (<>
              <div className="space-y-1.5">
                <Label>Description of items damaged or lost</Label>
                <Textarea value={form.property_description} onChange={set('property_description')} rows={2} placeholder="List items with serial numbers if known…" />
              </div>
              <div className="space-y-1.5">
                <Label>Nature of damage</Label>
                <Textarea value={form.damage_description} onChange={set('damage_description')} rows={2} placeholder="How was the damage caused…" />
              </div>
            </>)}
            <div className="space-y-1.5">
              <Label>Actions taken after the incident</Label>
              <Textarea value={form.post_incident_actions} onChange={set('post_incident_actions')} rows={2} placeholder="Police report filed, items secured, etc." />
            </div>
            <div className="space-y-1.5">
              <Label>Actions to prevent recurrence</Label>
              <Textarea value={form.prevention_actions} onChange={set('prevention_actions')} rows={2} placeholder="What can be done to prevent this happening again…" />
            </div>
          </CardContent></Card>

          {/* Section 6 & 7 */}
          <Card><CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-nova-navy text-white text-xs flex items-center justify-center font-bold flex-shrink-0">6</span>
              <h3 className="font-semibold text-nova-navy">Additional Information</h3>
            </div>
            <div className="space-y-1.5">
              <Label>Any other comments or context</Label>
              <Textarea value={form.additional_comments} onChange={set('additional_comments')} rows={2} placeholder="Anything else relevant to this incident…" />
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-nova-navy text-white text-xs flex items-center justify-center font-bold flex-shrink-0">7</span>
              <h3 className="font-semibold text-nova-navy">Notifications</h3>
            </div>
            <div className="space-y-1.5">
              <Label>Who has been notified about this incident?</Label>
              <Textarea value={form.notifications_list} onChange={set('notifications_list')} rows={2} placeholder="e.g. Campus Principal, HR Manager, Security…" />
            </div>
          </CardContent></Card>

          <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-semibold">
            {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting Report…</> : 'Submit Incident Report'}
          </Button>

          <p className="text-center text-xs text-gray-400 pb-4">
            © 2026 Nova Pioneer · Asset Reconciliation Platform · All submissions are confidential
          </p>
        </form>
      </div>
    </div>
  )
}
