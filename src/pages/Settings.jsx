import { Layout } from '@/components/Layout'
import { Save, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const initialCampuses = [
  { id:1, name:'Ruimsig',      shortName:'NPR', initials:'NPR' },
  { id:2, name:'Paulshof',     shortName:'NPP', initials:'NPP' },
  { id:3, name:'Midrand',      shortName:'NPM', initials:'NPM' },
  { id:4, name:'Boksburg',     shortName:'NPB', initials:'NPB' },
  { id:5, name:'North Riding', shortName:'NPN', initials:'NPN' },
]

const insuranceClasses = [
  { name:'Fire',                 desc:'Furniture, Fixtures, and Stock' },
  { name:'Buildings Combined',   desc:'Main building structures and Solar Panels' },
  { name:'Business All Risk',    desc:'Specialized mobility equipment and Laptops' },
  { name:'Electronic Equipment', desc:'Chromebooks, Laptops, and Projectors' },
]

export default function Settings() {
  const [rate, setRate] = useState(5)
  const [campuses, setCampuses] = useState(initialCampuses)
  const [newCampus, setNewCampus] = useState({ name:'', shortName:'', initials:'' })

  const handleSave = (e) => { e.preventDefault(); toast.success('Settings saved') }

  const handleAddCampus = (e) => {
    e.preventDefault()
    if (!newCampus.name || !newCampus.shortName || !newCampus.initials) { toast.error('All campus fields are required'); return }
    setCampuses((p) => [...p, { id: Date.now(), ...newCampus }])
    setNewCampus({ name:'', shortName:'', initials:'' })
    toast.success('Campus added')
  }

  const handleDeleteCampus = (id) => {
    setCampuses((p) => p.filter((c) => c.id !== id))
    toast.success('Campus removed')
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-nova-navy dark:text-white mb-1">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">System-wide configuration and preferences</p>
        </div>

        {/* System config */}
        <Card>
          <CardHeader><CardTitle>System Configuration</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <Label className="text-base font-semibold text-nova-navy dark:text-white mb-1 block">Annual Escalation Rate (%)</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Applied to all asset valuations for 2025 pricing calculations</p>
                <div className="flex items-center gap-4">
                  <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} min="0" max="100" step="0.1" className="w-28 text-lg font-bold" />
                  <span className="text-gray-500 font-semibold">%</span>
                  <div className="flex-1 p-3 bg-nova-green/10 border border-nova-green/30 rounded-xl">
                    <p className="text-xs font-semibold text-nova-navy dark:text-white mb-0.5">Example</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      R 100,000 + {rate}% = <strong>R {(100000 * (1 + rate / 100)).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-nova-navy dark:text-white mb-3">Database Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Assets</p>
                    <p className="text-2xl font-bold text-nova-navy dark:text-white">94,000+</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Sync</p>
                    <p className="text-2xl font-bold text-nova-navy dark:text-white">Today</p>
                  </div>
                </div>
              </div>

              <Button type="submit" className="gap-2"><Save size={16} /> Save Changes</Button>
            </form>
          </CardContent>
        </Card>

        {/* Campus registry */}
        <Card>
          <CardHeader><CardTitle>Campus Registry</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* existing */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['Campus Name','Short Code','Initials',''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {campuses.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-nova-navy dark:text-white">{c.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.shortName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.initials}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteCampus(c.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* add new */}
            <div>
              <h3 className="text-sm font-semibold text-nova-navy dark:text-white mb-3">Add New Campus</h3>
              <form onSubmit={handleAddCampus} className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1.5 flex-1 min-w-[160px]"><Label>Campus Name</Label><Input value={newCampus.name} onChange={(e) => setNewCampus((p) => ({ ...p, name: e.target.value }))} placeholder="Ormonde Fonteney" /></div>
                <div className="space-y-1.5 w-28"><Label>Short Code</Label><Input value={newCampus.shortName} onChange={(e) => setNewCampus((p) => ({ ...p, shortName: e.target.value }))} placeholder="NPO" /></div>
                <div className="space-y-1.5 w-28"><Label>Initials</Label><Input value={newCampus.initials} onChange={(e) => setNewCampus((p) => ({ ...p, initials: e.target.value }))} placeholder="NPO" /></div>
                <Button type="submit" variant="secondary"><Plus size={16} /> Add</Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Insurance classes */}
        <Card>
          <CardHeader><CardTitle>Insurance Classes</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {insuranceClasses.map((c) => (
                <div key={c.name} className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-nova-green transition-colors">
                  <p className="font-semibold text-nova-navy dark:text-white mb-0.5">{c.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{c.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Warning notice */}
        <div className="flex items-start gap-4 p-5 bg-nova-orange/10 border border-nova-orange/30 rounded-xl">
          <AlertCircle size={20} className="text-nova-orange flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-nova-orange mb-1">System Configuration Note</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Settings changes apply globally across all campuses and affect all future variance calculations.
              Current escalation rate: <strong>{rate}%</strong>. Please review before saving.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
