import { Layout } from '@/components/Layout'
import { Save, AlertCircle, Plus, Trash2, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { fetchCampuses, createCampus, deleteCampus, getApiError } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

const insuranceClasses = [
  { name: 'Fire', desc: 'Furniture, Fixtures, and Stock' },
  { name: 'Buildings Combined', desc: 'Main building structures and Solar Panels' },
  { name: 'Business All Risk', desc: 'Specialized mobility equipment and Laptops' },
  { name: 'Electronic Equipment', desc: 'Chromebooks, Laptops, and Projectors' },
]

export default function Settings() {
  const { isAdmin } = useAuth()
  const [rate, setRate] = useState(5)
  const [campuses, setCampuses] = useState([])
  const [loadingCampuses, setLoadingCampuses] = useState(true)
  const [newCampus, setNewCampus] = useState({ name: '', shortName: '', initials: '' })
  const [addingCampus, setAddingCampus] = useState(false)

  const loadCampuses = useCallback(async () => {
    setLoadingCampuses(true)
    try {
      const data = await fetchCampuses()
      setCampuses(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setLoadingCampuses(false)
    }
  }, [])

  useEffect(() => { loadCampuses() }, [loadCampuses])

  const handleSave = (e) => {
    e.preventDefault()
    toast.success('Settings saved')
  }

  const handleAddCampus = async (e) => {
    e.preventDefault()
    if (!newCampus.name || !newCampus.shortName || !newCampus.initials) {
      toast.error('All campus fields are required')
      return
    }
    setAddingCampus(true)
    try {
      const data = await createCampus(newCampus)
      setCampuses((p) => [...p, data.campus])
      setNewCampus({ name: '', shortName: '', initials: '' })
      toast.success('Campus added')
    } catch (err) {
      toast.error(getApiError(err))
    } finally {
      setAddingCampus(false)
    }
  }

  const handleDeleteCampus = async (id, name) => {
    if (!window.confirm(`Remove campus "${name}"?`)) return
    try {
      await deleteCampus(id)
      setCampuses((p) => p.filter((c) => c._id !== id))
      toast.success('Campus removed')
    } catch (err) {
      toast.error(getApiError(err))
    }
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
                <Label className="text-base font-semibold text-nova-navy dark:text-white mb-1 block">
                  Annual Escalation Rate (%)
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Applied to all asset valuations for 2025 pricing calculations
                </p>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    min="0" max="100" step="0.1"
                    className="w-28 text-lg font-bold"
                    disabled={!isAdmin}
                  />
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Registered Campuses</p>
                    <p className="text-2xl font-bold text-nova-navy dark:text-white">{campuses.length}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Sync</p>
                    <p className="text-2xl font-bold text-nova-navy dark:text-white">Today</p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <Button type="submit" className="gap-2"><Save size={16} /> Save Changes</Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Campus registry */}
        <Card>
          <CardHeader><CardTitle>Campus Registry</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['Campus Name', 'Short Code', 'Initials', ...(isAdmin ? [''] : [])].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loadingCampuses ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center">
                      <Loader2 size={20} className="animate-spin mx-auto text-nova-green" />
                    </td></tr>
                  ) : campuses.map((c) => (
                    <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-nova-navy dark:text-white">{c.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.shortName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.initials}</td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteCampus(c._id, c.name)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isAdmin && (
              <div>
                <h3 className="text-sm font-semibold text-nova-navy dark:text-white mb-3">Add New Campus</h3>
                <form onSubmit={handleAddCampus} className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1.5 flex-1 min-w-[160px]">
                    <Label>Campus Name</Label>
                    <Input value={newCampus.name} onChange={(e) => setNewCampus((p) => ({ ...p, name: e.target.value }))} placeholder="Ormonde Fonteney" />
                  </div>
                  <div className="space-y-1.5 w-28">
                    <Label>Short Code</Label>
                    <Input value={newCampus.shortName} onChange={(e) => setNewCampus((p) => ({ ...p, shortName: e.target.value }))} placeholder="NPO" />
                  </div>
                  <div className="space-y-1.5 w-28">
                    <Label>Initials</Label>
                    <Input value={newCampus.initials} onChange={(e) => setNewCampus((p) => ({ ...p, initials: e.target.value }))} placeholder="NPO" />
                  </div>
                  <Button type="submit" variant="secondary" disabled={addingCampus}>
                    {addingCampus ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={16} /> Add</>}
                  </Button>
                </form>
              </div>
            )}
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
