import { Layout } from '@/components/Layout'
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { fetchUsers, createUser, inviteUser, updateUser, deleteUser, approveUser, getApiError } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useCampuses } from '@/context/CampusContext'
import QRCode from 'react-qr-code'

const roleVariant = { admin: 'default', campus_manager: 'info', viewer: 'secondary' }
const roleLabel = { super_admin: 'Super Admin', admin: 'Admin', campus_manager: 'Campus Manager', viewer: 'Viewer' }
const statusColour = {
  active:    'bg-green-100 text-green-700',
  pending:   'bg-amber-100 text-amber-700',
  inactive:  'bg-gray-100 text-gray-500',
  suspended: 'bg-red-100 text-red-700',
}

const emptyForm = { name: '', email: '', role: 'viewer', region: 'South Africa', campus: '', status: 'active' }

export default function Users() {
  const { user: currentUser, isSuperAdmin, isAdmin } = useAuth()
  const { campuses } = useCampuses()

  // Roles this user is allowed to assign
  const assignableRoles = isSuperAdmin
    ? ['viewer', 'campus_manager', 'admin', 'super_admin']
    : ['viewer', 'campus_manager']  // plain admin can only manage these two

  const roleLabels = {
    viewer:         'Viewer',
    campus_manager: 'Campus Manager',
    admin:          'Admin',
    super_admin:    'Super Admin',
  }

  // Whether the current user can edit/delete a given target user
  const canManage = (target) => {
    if (isSuperAdmin) return true
    // admin can only touch campus_manager and viewer
    return !['admin', 'super_admin'].includes(target.role)
  }
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  // Invite link dialog — shown after successful invite
  const [inviteResult, setInviteResult] = useState(null) // { name, email, url, emailSent }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const filtered = users.filter((u) =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (statusFilter === 'all' || u.status === statusFilter)
  )

  const openCreate = () => {
    setEditUser(null)
    setForm({ ...emptyForm, region: currentUser?.region || 'South Africa' })
    setDialogOpen(true)
  }
  const openEdit = (u) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, region: u.region || '', campus: u.campus || '', status: u.status })
    setDialogOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email) { toast.error('Name and email are required'); return }

    setSubmitting(true)
    try {
      if (editUser) {
        const data = await updateUser(editUser._id, form)
        toast.success('User updated')
        setUsers((p) => p.map((u) => u._id === editUser._id ? { ...u, ...data.user } : u))
      } else {
        const data = await inviteUser(form)
        setUsers((p) => [data.user, ...p])
        setDialogOpen(false)
        // Always show the invite link dialog with QR code
        setInviteResult({
          name: form.name,
          email: form.email,
          url: data.inviteUrl,
          emailSent: data.emailSent,
        })
        if (data.emailSent) {
          toast.success(`Invitation sent to ${form.email}`)
        } else {
          toast.warning('User created — email delivery failed. Share the link below.')
        }
        return // don't close dialog here — inviteResult dialog takes over
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return
    try {
      await deleteUser(id)
      setUsers((p) => p.filter((u) => u._id !== id))
      toast.success('User deleted')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  const handleApprove = async (id, action) => {
    try {
      await approveUser(id, action)
      setUsers((p) => p.map((u) => u._id === id ? { ...u, status: action === 'approve' ? 'active' : 'suspended' } : u))
      toast.success(action === 'approve' ? 'User approved and notified by email' : 'User rejected')
    } catch (err) {
      toast.error(getApiError(err))
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 size={36} className="animate-spin text-nova-green" />
        </div>
      </Layout>
    )
  }

  const pendingCount = users.filter((u) => u.status === 'pending').length

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">User Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage roles, permissions, and access</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadUsers}><RefreshCw size={14} /></Button>
            <Button onClick={openCreate}><Plus size={16} /> Invite User</Button>
          </div>
        </div>

        {/* Pending approval banner */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              {pendingCount} user{pendingCount > 1 ? 's' : ''} awaiting account approval
            </p>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="campus_manager">Campus Manager</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-semibold text-nova-navy dark:text-white text-sm">
              Users ({filtered.length} of {users.length})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  {['Name', 'Email', 'Role', 'Region', 'Campus', 'Status', 'Last Login', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No users found</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-nova-green flex items-center justify-center text-nova-navy font-bold text-xs flex-shrink-0">
                          {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-nova-navy dark:text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'admin' ? 'bg-nova-navy text-white' :
                        u.role === 'campus_manager' ? 'bg-sky-100 text-sky-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {roleLabel[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{u.region || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{u.campus || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColour[u.status] || 'bg-gray-100 text-gray-600'}`}>
                        {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                      </span>
                    </td>                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Approve/Reject for pending */}
                        {u.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(u._id, 'approve')}
                              className="p-1.5 rounded-lg text-nova-green hover:bg-nova-green/10 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => handleApprove(u._id, 'reject')}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Reject"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors"
                          title="Edit"
                          disabled={!canManage(u)}
                          style={{ opacity: canManage(u) ? 1 : 0.3, cursor: canManage(u) ? 'pointer' : 'not-allowed' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        {u._id !== currentUser?._id && canManage(u) && (
                          <button
                            onClick={() => handleDelete(u._id, u.name)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Invite User'}</DialogTitle>
            <DialogDescription>
              {editUser
                ? 'Update user details, role and access settings.'
                : 'Enter the user\'s details. They will receive an email with a link to set their own password.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="john@novapioneer.co.za"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
                  disabled={editUser && !canManage(editUser)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((r) => (
                      <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                    ))}
                    {/* If editing someone whose role is outside assignable list, show it but locked */}
                    {editUser && !assignableRoles.includes(editUser.role) && (
                      <SelectItem value={editUser.role} disabled>{roleLabels[editUser.role] || editUser.role}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {editUser && !canManage(editUser) && (
                  <p className="text-[10px] text-amber-600 mt-1">Only a Super Admin can change this user's role.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Select
                  value={form.region}
                  onValueChange={(v) => setForm((p) => ({ ...p, region: v }))}
                  disabled={!isSuperAdmin}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="South Africa">South Africa</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                  </SelectContent>
                </Select>
                {!isSuperAdmin && (
                  <p className="text-[10px] text-gray-400 mt-1">Region is fixed to your own region.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Campus
                  {form.role === 'campus_manager' && (
                    <span className="text-[10px] text-nova-teal ml-1">— required for Campus Manager</span>
                  )}
                </Label>
                <Select
                  value={form.campus || '__none__'}
                  onValueChange={(v) => setForm((p) => ({ ...p, campus: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {campuses.map((c) => (
                      <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 size={14} className="animate-spin" /> {editUser ? 'Saving…' : 'Sending Invite…'}</> : editUser ? 'Save Changes' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Invite Result Dialog — QR code + link ───────────────────────────── */}
      {inviteResult && (
        <Dialog open={!!inviteResult} onOpenChange={() => setInviteResult(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {inviteResult.emailSent
                  ? <><CheckCircle size={18} className="text-green-600" /> Invite Sent</>
                  : <><AlertTriangle size={18} className="text-amber-500" /> Share Invite Link</>
                }
              </DialogTitle>
              <DialogDescription>
                {inviteResult.emailSent
                  ? `An email was sent to ${inviteResult.email}. Also share the QR code or link as a backup.`
                  : `Email couldn't be delivered to ${inviteResult.email}. Share the link or QR code below.`
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-nova-green flex items-center justify-center text-nova-navy font-bold text-sm flex-shrink-0">
                  {inviteResult.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-nova-navy dark:text-white text-sm">{inviteResult.name}</p>
                  <p className="text-xs text-gray-500">{inviteResult.email}</p>
                </div>
              </div>

              {/* QR Code */}
              {inviteResult.url && (
                <div className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Scan to set password</p>
                  <QRCode
                    value={inviteResult.url}
                    size={180}
                    level="M"
                    fgColor="#0A1628"
                    style={{ height: 180, width: 180 }}
                  />
                  <p className="text-[10px] text-gray-400">Valid for 7 days</p>
                </div>
              )}

              {/* Link */}
              {inviteResult.url && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">Or share this link:</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={inviteResult.url}
                      className="flex-1 text-xs p-2.5 border border-gray-200 rounded-lg bg-gray-50 font-mono truncate"
                      onClick={(e) => e.target.select()}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard?.writeText(inviteResult.url)
                        toast.success('Link copied!')
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {/* Share via Web Share API (mobile) */}
              {inviteResult.url && navigator.share && (
                <Button
                  className="w-full"
                  onClick={() => navigator.share({
                    title: 'SAIT Invite — Nova Pioneer',
                    text: `Hi ${inviteResult.name}, you've been invited to SAIT. Click the link to set your password.`,
                    url: inviteResult.url,
                  })}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                  </svg>
                  Share via WhatsApp / Email
                </Button>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteResult(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  )
}
