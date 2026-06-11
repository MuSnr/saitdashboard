import { Layout } from '@/components/Layout'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const seed = [
  { id:'1', display_name:'Sarah Johnson', email:'sarah@sait.co.za',   role:'Admin',          region:'South Africa', status:'Active',   last_login:'2025-01-28' },
  { id:'2', display_name:'John Mwangi',   email:'john@sait.co.za',    role:'Campus Manager', region:'Kenya',        status:'Active',   last_login:'2025-01-27' },
  { id:'3', display_name:'Emma Dlamini',  email:'emma@sait.co.za',    role:'Viewer',         region:'South Africa', status:'Active',   last_login:'2025-01-26' },
  { id:'4', display_name:'David Chen',    email:'david@sait.co.za',   role:'Campus Manager', region:'South Africa', status:'Inactive', last_login:'2025-01-10' },
]

const roleVariant = { Admin:'default', 'Campus Manager':'info', Viewer:'secondary' }

export default function Users() {
  const [users, setUsers] = useState(seed)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState({ display_name:'', email:'', role:'Viewer', region:'South Africa' })

  const filtered = users.filter((u) =>
    (roleFilter === 'all' || u.role === roleFilter) &&
    (regionFilter === 'all' || u.region === regionFilter) &&
    (statusFilter === 'all' || u.status === statusFilter)
  ).sort((a, b) => b.last_login.localeCompare(a.last_login))

  const handleAdd = (e) => {
    e.preventDefault()
    if (!form.display_name || !form.email) { toast.error('Name and email are required'); return }
    const now = new Date().toISOString().split('T')[0]
    setUsers((p) => [{ id: Math.random().toString(), ...form, status:'Active', last_login: now }, ...p])
    setForm({ display_name:'', email:'', role:'Viewer', region:'South Africa' })
    setDialogOpen(false)
    toast.success('User added')
  }

  const toggleStatus = (id) => {
    setUsers((p) => p.map((u) => u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u))
  }

  const handleDelete = (id) => {
    setUsers((p) => p.filter((u) => u.id !== id))
    toast.success('User removed')
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">User Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage roles, permissions, and access by region</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}><Plus size={16} /> Add User</Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Roles</SelectItem>{['Admin','Campus Manager','Viewer'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Region" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Regions</SelectItem>{['South Africa','Kenya'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className="font-semibold text-nova-navy dark:text-white text-sm">Users ({filtered.length} of {users.length})</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  {['Name','Email','Role','Region','Status','Last Login','Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-nova-green flex items-center justify-center text-nova-navy font-bold text-xs flex-shrink-0">
                          {u.display_name.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <span className="font-medium text-nova-navy dark:text-white">{u.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3"><Badge variant={roleVariant[u.role]||'secondary'}>{u.role}</Badge></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.region}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(u.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${u.status === 'Active' ? 'bg-nova-green/20 text-nova-navy dark:text-nova-green hover:bg-nova-green/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300'}`}
                      >
                        {u.status}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg text-nova-teal hover:bg-nova-teal/10 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="space-y-1.5"><Label>Full Name *</Label><Input value={form.display_name} onChange={(e) => setForm((p)=>({...p,display_name:e.target.value}))} placeholder="John Doe" required /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm((p)=>({...p,email:e.target.value}))} placeholder="john@sait.co.za" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm((p)=>({...p,role:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Viewer','Campus Manager','Admin'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Region</Label>
                <Select value={form.region} onValueChange={(v) => setForm((p)=>({...p,region:v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="South Africa">South Africa</SelectItem><SelectItem value="Kenya">Kenya</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Add User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
