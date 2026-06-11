import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Plus, Trash2, Edit2, Loader2, ChevronRight, Building2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useCampuses } from '@/context/CampusContext'
import {
  createCampus, updateCampus, deleteCampus,
  createSubCampus, updateSubCampus, deleteSubCampus,
  getApiError,
} from '@/services/api'

// ── Campus dialog ─────────────────────────────────────────────────────────────
function CampusDialog({ open, onClose, existing, onSaved }) {
  const [form, setForm] = useState(
    existing
      ? { name: existing.name, shortName: existing.shortName, initials: existing.initials, region: existing.region || 'South Africa' }
      : { name: '', shortName: '', initials: '', region: 'South Africa' }
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.shortName || !form.initials) {
      toast.error('Name, short name and initials are required')
      return
    }
    setSaving(true)
    try {
      if (existing) {
        const data = await updateCampus(existing._id, form)
        toast.success('Campus updated')
        onSaved(data.campus, 'update')
      } else {
        const data = await createCampus(form)
        toast.success('Campus added')
        onSaved(data.campus, 'create')
      }
      onClose()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Campus' : 'Add Campus'}</DialogTitle>
          <DialogDescription>
            {existing ? 'Update campus details.' : 'Add a new campus. Sub-campuses can be added after.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Campus Name *</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Ruimsig" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Short Name *</Label>
              <Input value={form.shortName} onChange={(e) => setForm((p) => ({ ...p, shortName: e.target.value }))} placeholder="NPR" required />
            </div>
            <div className="space-y-1.5">
              <Label>Initials *</Label>
              <Input value={form.initials} onChange={(e) => setForm((p) => ({ ...p, initials: e.target.value }))} placeholder="NPR" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Region</Label>
            <Select value={form.region} onValueChange={(v) => setForm((p) => ({ ...p, region: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="South Africa">South Africa</SelectItem>
                <SelectItem value="Kenya">Kenya</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : existing ? 'Save Changes' : 'Add Campus'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Sub-campus dialog ─────────────────────────────────────────────────────────
function SubCampusDialog({ open, onClose, campuses, existing, preselectedCampus, onSaved }) {
  const [form, setForm] = useState(
    existing
      ? { name: existing.name, shortName: existing.shortName || '', campus: existing.campus?._id || existing.campus || '' }
      : { name: '', shortName: '', campus: preselectedCampus || '' }
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.campus) {
      toast.error('Name and campus are required')
      return
    }
    setSaving(true)
    try {
      if (existing) {
        const data = await updateSubCampus(existing._id, { name: form.name, shortName: form.shortName })
        toast.success('Sub-campus updated')
        onSaved(data.subCampus, 'update')
      } else {
        const data = await createSubCampus(form)
        toast.success('Sub-campus added')
        onSaved(data.subCampus, 'create')
      }
      onClose()
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit Sub-Campus' : 'Add Sub-Campus'}</DialogTitle>
          <DialogDescription>
            {existing ? 'Update sub-campus details.' : 'Add a sub-campus under an existing campus (e.g. Ruimsig JS, Ruimsig SS).'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {!existing && (
            <div className="space-y-1.5">
              <Label>Parent Campus *</Label>
              <Select value={form.campus} onValueChange={(v) => setForm((p) => ({ ...p, campus: v }))}>
                <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                <SelectContent>
                  {campuses.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Sub-Campus Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Ruimsig JS"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Short Name</Label>
            <Input
              value={form.shortName}
              onChange={(e) => setForm((p) => ({ ...p, shortName: e.target.value }))}
              placeholder="e.g. NPR-JS"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : existing ? 'Save Changes' : 'Add Sub-Campus'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Locations() {
  const { campuses, subCampuses, loading, reload, getSubCampusesFor } = useCampuses()

  // Which campus row is expanded
  const [expandedCampus, setExpandedCampus] = useState(null)

  // Campus dialog state
  const [campusDialog, setCampusDialog] = useState({ open: false, existing: null })
  // Sub-campus dialog state
  const [subDialog, setSubDialog] = useState({ open: false, existing: null, preselected: null })

  // ── Campus actions ─────────────────────────────────────────────────────────
  const handleCampusSaved = (campus, action) => {
    reload()
  }

  const handleDeleteCampus = async (campus) => {
    const subs = getSubCampusesFor(campus._id)
    if (subs.length > 0) {
      toast.error(`Remove all ${subs.length} sub-campus(es) under "${campus.name}" first.`)
      return
    }
    if (!window.confirm(`Delete campus "${campus.name}"? This cannot be undone.`)) return
    try {
      await deleteCampus(campus._id)
      toast.success('Campus deleted')
      reload()
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  // ── Sub-campus actions ─────────────────────────────────────────────────────
  const handleSubSaved = () => reload()

  const handleDeleteSub = async (sub) => {
    if (!window.confirm(`Delete sub-campus "${sub.name}"?`)) return
    try {
      await deleteSubCampus(sub._id)
      toast.success('Sub-campus deleted')
      reload()
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Campuses & Locations</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage campuses and their sub-campuses. These are used across all forms in the system.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSubDialog({ open: true, existing: null, preselected: null })}
            >
              <MapPin size={15} /> Add Sub-Campus
            </Button>
            <Button onClick={() => setCampusDialog({ open: true, existing: null })}>
              <Building2 size={15} /> Add Campus
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="p-5">
            <p className="text-xs text-gray-500 mb-1">Total Campuses</p>
            <p className="text-3xl font-bold text-nova-navy dark:text-white">{campuses.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs text-gray-500 mb-1">Total Sub-Campuses</p>
            <p className="text-3xl font-bold text-nova-navy dark:text-white">{subCampuses.length}</p>
          </CardContent></Card>
        </div>

        {/* Campus list */}
        <Card className="overflow-hidden">
          <CardHeader className="py-4 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="text-sm">
              {loading ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</span> : `Campuses (${campuses.length})`}
            </CardTitle>
          </CardHeader>

          {campuses.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Building2 size={36} className="opacity-30" />
              <p className="font-medium">No campuses yet — click "Add Campus" to start</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {campuses.map((campus) => {
                const subs = getSubCampusesFor(campus._id)
                const isExpanded = expandedCampus === campus._id

                return (
                  <div key={campus._id}>
                    {/* Campus row */}
                    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedCampus(isExpanded ? null : campus._id)}
                        className="p-1 rounded text-gray-400 hover:text-nova-navy dark:hover:text-white transition-colors"
                      >
                        <ChevronRight size={16} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-nova-navy/10 dark:bg-nova-navy/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-nova-navy dark:text-white">{campus.initials}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-nova-navy dark:text-white text-sm">{campus.name}</p>
                        <p className="text-xs text-gray-400">{campus.shortName} · {campus.region} · {subs.length} sub-campus{subs.length !== 1 ? 'es' : ''}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 px-2 text-nova-teal"
                          onClick={() => setSubDialog({ open: true, existing: null, preselected: campus._id })}
                        >
                          <Plus size={12} /> Sub-Campus
                        </Button>
                        <button
                          onClick={() => setCampusDialog({ open: true, existing: campus })}
                          className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteCampus(campus)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Sub-campus rows — shown when expanded */}
                    {isExpanded && (
                      <div className="bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
                        {subs.length === 0 ? (
                          <div className="flex items-center gap-3 px-14 py-3 text-gray-400">
                            <MapPin size={14} className="opacity-50" />
                            <span className="text-xs">No sub-campuses yet.</span>
                            <button
                              onClick={() => setSubDialog({ open: true, existing: null, preselected: campus._id })}
                              className="text-xs text-nova-teal hover:underline"
                            >
                              Add one
                            </button>
                          </div>
                        ) : (
                          subs.map((sub) => (
                            <div key={sub._id} className="flex items-center gap-3 px-14 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                              <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-nova-navy dark:text-white font-medium">{sub.name}</span>
                                {sub.shortName && <span className="text-xs text-gray-400 ml-2">({sub.shortName})</span>}
                              </div>
                              <Badge variant="secondary" className="text-[10px]">Sub-campus</Badge>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setSubDialog({ open: true, existing: sub, preselected: null })}
                                  className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSub(sub)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Campus dialog */}
      {campusDialog.open && (
        <CampusDialog
          open={campusDialog.open}
          onClose={() => setCampusDialog({ open: false, existing: null })}
          existing={campusDialog.existing}
          onSaved={handleCampusSaved}
        />
      )}

      {/* Sub-campus dialog */}
      {subDialog.open && (
        <SubCampusDialog
          open={subDialog.open}
          onClose={() => setSubDialog({ open: false, existing: null, preselected: null })}
          campuses={campuses}
          existing={subDialog.existing}
          preselectedCampus={subDialog.preselected}
          onSaved={handleSubSaved}
        />
      )}
    </Layout>
  )
}
