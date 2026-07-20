import { Layout } from '@/components/Layout'
import { Plus, Edit2, Trash2, AlertCircle, Loader2, RefreshCw, CheckCircle, Download } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  fetchIncidents, createIncident, updateIncident,
  deleteIncident, convertIncidentToClaim, getApiError,
} from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useCampuses } from '@/context/CampusContext'
import { useNavigate } from 'react-router-dom'
import { downloadIncidentPdf } from '@/lib/incidentPdf'

const INCIDENT_TYPES    = ['Theft', 'Accidental Damage', 'Natural Disaster', 'Fire', 'Power Surge', 'Other']
const TIMING_TYPES      = ['Occurred', 'Noticed']
const LOCATION_TYPES    = ['On NP Property', 'Outside NP Property']
const DAMAGE_TYPES      = ['None', 'Damaged', 'Lost property / equipment', 'Both Damaged & Lost']

const statusColour = {
  New:             'bg-blue-100 text-blue-700',
  'Under Review':  'bg-amber-100 text-amber-700',
  Converted:       'bg-green-100 text-green-700',
  Dismissed:       'bg-gray-100 text-gray-500',
}

const blankForm = {
  // Section 1
  reporter_name: '', reporter_email: '', campus_id: '',
  incident_date_time: '', timing_type: 'Occurred',
  // Section 2
  incident_type: 'Theft', description: '',
  incident_location_type: 'On NP Property', exact_location: '',
  duty_station_detail: '',
  // Section 3
  people_involved: '', involvement_description: '',
  // Section 4
  injured_persons: '', injury_description: '', injury_actions_taken: '',
  // Section 5
  property_damage_type: 'None', property_description: '', damage_description: '',
  prevention_actions: '', post_incident_actions: '',
  // Section 6
  additional_comments: '',
  // Section 7
  notifications_list: '',
}

const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—'
const setF = (setForm) => (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
const setV = (setForm) => (key) => (v) => setForm((p) => ({ ...p, [key]: v }))

export default function Incidents() {
  const { isAdmin, isCampusManager, isSuperAdmin, region } = useAuth()
  const { campuses } = useCampuses()
  const navigate = useNavigate()

  const [incidents, setIncidents]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [viewIncident, setViewIncident] = useState(null)
  const [editMode, setEditMode]       = useState(false)
  const [form, setForm]               = useState(blankForm)
  const [submitting, setSubmitting]   = useState(false)
  const [converting, setConverting]   = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter]   = useState('all')

  const canWrite = isAdmin || isCampusManager
  const sf = setF(setForm)
  const sv = setV(setForm)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Pass active region for super_admin so backend filters correctly
      const params = isSuperAdmin ? { region } : {}
      const data = await fetchIncidents(params)
      setIncidents(Array.isArray(data) ? data : [])
    } catch (err) { toast.error(getApiError(err)) }
    finally { setLoading(false) }
  }, [isSuperAdmin, region])

  // Reload when region changes (super_admin profile switch)
  useEffect(() => { load() }, [load])

  const filtered = incidents.filter((i) =>
    (statusFilter === 'all' || i.status === statusFilter) &&
    (typeFilter === 'all'   || i.incident_type === typeFilter)
  )

  const stats = {
    total:       incidents.length,
    new:         incidents.filter((i) => i.status === 'New').length,
    underReview: incidents.filter((i) => i.status === 'Under Review').length,
    converted:   incidents.filter((i) => i.status === 'Converted').length,
    dismissed:   incidents.filter((i) => i.status === 'Dismissed').length,
  }

  const openCreate = () => {
    setEditMode(false)
    setViewIncident(null)
    setForm(blankForm)
    setDialogOpen(true)
  }

  const openEdit = (i) => {
    setEditMode(true)
    setViewIncident(i)
    setForm({
      reporter_name:           i.reporter_name || '',
      reporter_email:          i.reporter_email || '',
      campus_id:               i.campus_id?._id || i.campus_id || '',
      incident_date_time:      i.incident_date_time ? new Date(i.incident_date_time).toISOString().slice(0, 16) : '',
      timing_type:             i.timing_type || 'Occurred',
      incident_type:           i.incident_type || 'Theft',
      description:             i.description || '',
      incident_location_type:  i.incident_location_type || 'On NP Property',
      exact_location:          i.exact_location || '',
      duty_station_detail:     i.duty_station_detail || '',
      people_involved:         i.people_involved || '',
      involvement_description: i.involvement_description || '',
      injured_persons:         i.injured_persons || '',
      injury_description:      i.injury_description || '',
      injury_actions_taken:    i.injury_actions_taken || '',
      property_damage_type:    i.property_damage_type || 'None',
      property_description:    i.property_description || '',
      damage_description:      i.damage_description || '',
      prevention_actions:      i.prevention_actions || '',
      post_incident_actions:   i.post_incident_actions || '',
      additional_comments:     i.additional_comments || '',
      notifications_list:      i.notifications_list || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.reporter_name || !form.reporter_email || !form.campus_id || !form.incident_date_time || !form.description) {
      toast.error('Sections 1 & 2 are required: reporter details, campus, date/time and description')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v) })

      if (editMode && viewIncident) {
        const payload = { ...form }
        const data = await updateIncident(viewIncident._id, payload)
        setIncidents((p) => p.map((i) => i._id === viewIncident._id ? { ...i, ...data.incident } : i))
        toast.success('Incident updated')
      } else {
        const data = await createIncident(fd)
        setIncidents((p) => [data.incident, ...p])
        toast.success(`Incident ${data.incident?.incident_ref} submitted`)
      }
      setDialogOpen(false)
    } catch (err) { toast.error(getApiError(err)) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id, ref) => {
    if (!window.confirm(`Delete incident ${ref}? This cannot be undone.`)) return
    try {
      await deleteIncident(id)
      setIncidents((p) => p.filter((i) => i._id !== id))
      toast.success('Incident deleted')
    } catch (err) { toast.error(getApiError(err)) }
  }

  const handleConvert = async (incident) => {
    if (!window.confirm(`Convert ${incident.incident_ref} to a formal claim?`)) return
    setConverting(incident._id)
    try {
      const data = await convertIncidentToClaim(incident._id)
      toast.success(`Claim ${data.claim?.claimId} created`)
      await load()
    } catch (err) { toast.error(getApiError(err)) }
    finally { setConverting(null) }
  }

  const SectionHeader = ({ num, title }) => (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-full bg-nova-navy text-nova-green text-xs font-bold flex items-center justify-center flex-shrink-0">{num}</div>
      <h3 className="text-sm font-bold text-nova-navy dark:text-white">{title}</h3>
    </div>
  )

  return (
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Incident Notifications</h1>
            <p className="text-gray-500 dark:text-gray-400">Security Services — Incident Notification Report</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw size={14} /></Button>
            {canWrite && <Button onClick={openCreate}><Plus size={16} /> New Incident</Button>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total',        value: stats.total,       colour: 'text-nova-navy dark:text-white' },
            { label: 'New',          value: stats.new,         colour: 'text-blue-600' },
            { label: 'Under Review', value: stats.underReview, colour: 'text-amber-600' },
            { label: 'Converted',    value: stats.converted,   colour: 'text-green-600' },
            { label: 'Dismissed',    value: stats.dismissed,   colour: 'text-gray-500' },
          ].map(({ label, value, colour }) => (
            <Card key={label}><CardContent className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${colour}`}>{value}</p>
            </CardContent></Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {['New', 'Under Review', 'Converted', 'Dismissed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
            <span className="font-semibold text-nova-navy dark:text-white text-sm">
              {loading ? 'Loading…' : `Incidents (${filtered.length})`}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-nova-green" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <AlertCircle size={40} className="opacity-40" />
              <p className="font-medium">No incidents yet — submit your first incident report</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['Ref', 'Status', 'Campus', 'Type', 'Reporter', 'Date', 'Location', 'Property Loss', 'Linked Claim', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.map((i) => (
                    <tr key={i._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-nova-navy dark:text-white whitespace-nowrap">{i.incident_ref}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColour[i.status] || 'bg-gray-100 text-gray-600'}`}>{i.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{i.campus_id?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{i.incident_type}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{i.reporter_name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(i.incident_date_time)}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{i.exact_location || i.campus_id?.name || '—'}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${i.property_damage_type === 'None' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'}`}>
                          {i.property_damage_type || 'None'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {i.linked_claim_id
                          ? <button onClick={() => navigate('/claims')} className="text-nova-teal hover:underline font-mono text-[10px]">{i.linked_claim_id?.claimId || 'View'}</button>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Download PDF */}
                          <button onClick={() => downloadIncidentPdf(i).catch(() => {})} title="Download PDF Report"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Download size={13} />
                          </button>
                          {canWrite && !i.is_converted_to_claim && (
                            <button onClick={() => handleConvert(i)} disabled={converting === i._id} title="Convert to Claim"
                              className="p-1.5 rounded-lg text-nova-green hover:bg-nova-green/10 transition-colors disabled:opacity-50">
                              {converting === i._id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                            </button>
                          )}
                          {canWrite && (
                            <button onClick={() => openEdit(i)} title="Edit" className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors">
                              <Edit2 size={13} />
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDelete(i._id, i.incident_ref)} title="Delete"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Incident Form Dialog — all 7 sections */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle>{editMode ? `Edit Incident — ${viewIncident?.incident_ref}` : 'Incident Notification Report'}</DialogTitle>
                <DialogDescription>Security Services · Nova Pioneer</DialogDescription>
              </div>
              {editMode && viewIncident && (
                <button
                  type="button"
                  onClick={() => downloadIncidentPdf(viewIncident)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-nova-navy border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors flex-shrink-0 mt-1"
                  title="Download PDF Report"
                >
                  <Download size={13} /> Download PDF
                </button>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-2">

            {/* Section 1 — Reporter's Details */}
            <div>
              <SectionHeader num="1" title="Reporter's Details" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>a) Report compiled by *</Label>
                  <Input value={form.reporter_name} onChange={sf('reporter_name')} placeholder="Full name" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Reporter Email *</Label>
                  <Input type="email" value={form.reporter_email} onChange={sf('reporter_email')} placeholder="email@novapioneer.com" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-1.5">
                  <Label>b) Normal duty station (Campus) *</Label>
                  <Select value={form.campus_id} onValueChange={sv('campus_id')}>
                    <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                    <SelectContent>{campuses.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>c) Date and time of incident *</Label>
                  <Input type="datetime-local" value={form.incident_date_time} onChange={sf('incident_date_time')} required />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label>d) Was the date/time when the incident occurred or noticed?</Label>
                <Select value={form.timing_type} onValueChange={sv('timing_type')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMING_TYPES.map((t) => <SelectItem key={t} value={t}>This is when the incident {t.toLowerCase()}.</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Section 2 — Incident Details */}
            <div>
              <SectionHeader num="2" title="Incident Details" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>a) Where did the incident happen?</Label>
                  <Select value={form.incident_location_type} onValueChange={sv('incident_location_type')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>b) Exact location of incident</Label>
                  <Input value={form.exact_location} onChange={sf('exact_location')} placeholder="e.g. Nairobi CBD, Central Kitchen" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-1.5">
                  <Label>Incident type *</Label>
                  <Select value={form.incident_type} onValueChange={sv('incident_type')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{INCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Specific duty station detail</Label>
                  <Input value={form.duty_station_detail} onChange={sf('duty_station_detail')} placeholder="e.g. Prep Kitchen, Classroom 3A" />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label>c) Brief description of the incident *</Label>
                <Textarea value={form.description} onChange={sf('description')} rows={4} placeholder="Describe what happened…" required />
              </div>
            </div>

            <Separator />

            {/* Section 3 — People Involved */}
            <div>
              <SectionHeader num="3" title="People Involved" />
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>a) Names of people involved or who witnessed the incident</Label>
                  <Input value={form.people_involved} onChange={sf('people_involved')} placeholder="e.g. Dean Dorcas Oginga, Nairobi Central Police Station" />
                </div>
                <div className="space-y-1.5">
                  <Label>b) Nature of their involvement</Label>
                  <Textarea value={form.involvement_description} onChange={sf('involvement_description')} rows={2} placeholder="Describe how each person was involved…" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 4 — Injuries */}
            <div>
              <SectionHeader num="4" title="Injuries" />
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>a) Names of persons injured (if any)</Label>
                  <Input value={form.injured_persons} onChange={sf('injured_persons')} placeholder="N/A if none" />
                </div>
                <div className="space-y-1.5">
                  <Label>b) Nature of injuries</Label>
                  <Textarea value={form.injury_description} onChange={sf('injury_description')} rows={2} placeholder="N/A if none" />
                </div>
                <div className="space-y-1.5">
                  <Label>c) Actions taken for injured person(s)</Label>
                  <Textarea value={form.injury_actions_taken} onChange={sf('injury_actions_taken')} rows={2} placeholder="N/A if none" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 5 — Damage / Loss */}
            <div>
              <SectionHeader num="5" title="Damage to or Loss of Property and Equipment" />
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>a) Was property damaged or lost?</Label>
                  <Select value={form.property_damage_type} onValueChange={sv('property_damage_type')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAMAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.property_damage_type !== 'None' && (
                  <>
                    <div className="space-y-1.5">
                      <Label>b) Detailed description of property/equipment lost or damaged</Label>
                      <Textarea value={form.property_description} onChange={sf('property_description')} rows={2} placeholder="e.g. Samsung A03 (School Phone), Nokia Flip (Personal), Oraimo Earbuds (Personal)" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>c) Nature of damage (if applicable)</Label>
                      <Textarea value={form.damage_description} onChange={sf('damage_description')} rows={2} placeholder="N/A if lost/stolen" />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label>e) Actions taken to prevent the loss/damage</Label>
                  <Textarea value={form.prevention_actions} onChange={sf('prevention_actions')} rows={2} placeholder="e.g. Reported to line manager and police" />
                </div>
                <div className="space-y-1.5">
                  <Label>f) Actions taken upon realising the loss/damage</Label>
                  <Textarea value={form.post_incident_actions} onChange={sf('post_incident_actions')} rows={2} placeholder="e.g. Reported to line manager and police" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 6 — Additional Information */}
            <div>
              <SectionHeader num="6" title="Any Other Information" />
              <div className="space-y-1.5">
                <Label>a) Additional comments, questions or statements</Label>
                <Textarea value={form.additional_comments} onChange={sf('additional_comments')} rows={2} placeholder="Any other relevant information…" />
              </div>
            </div>

            <Separator />

            {/* Section 7 — Notifications */}
            <div>
              <SectionHeader num="7" title="Notifications" />
              <div className="space-y-1.5">
                <Label>This report was notified to the following people (a, b, c)</Label>
                <Textarea value={form.notifications_list} onChange={sf('notifications_list')} rows={2} placeholder="e.g. a) Dean Dorcas Oginga  b) HR Manager  c) Insurance Team" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : editMode ? 'Save Changes' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
