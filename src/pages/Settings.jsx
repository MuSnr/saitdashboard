import { Layout } from '@/components/Layout'
import { Save, AlertCircle, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useCampuses } from '@/context/CampusContext'
import { Link } from 'react-router-dom'

const INSURANCE_CLASSES = [
  { name: 'Fire',                  desc: 'Furniture, Fixtures, and Stock' },
  { name: 'Buildings Combined',    desc: 'Main building structures and Solar Panels' },
  { name: 'Business All Risk',     desc: 'Specialized mobility equipment and Laptops' },
  { name: 'Electronic Equipment',  desc: 'Chromebooks, Laptops, and Projectors' },
  { name: 'Theft Section',         desc: 'Theft-related losses' },
  { name: 'Business Interruption', desc: 'Loss of income due to insured events' },
  { name: 'Public Liability',      desc: 'Third-party injury or property damage' },
  { name: 'Umbrella Liability',    desc: 'Excess liability coverage' },
  { name: 'Employers Liability',   desc: 'Employee injury at work' },
  { name: 'Sasria',                desc: 'Special risks (riots, civil unrest)' },
  { name: 'Broker Fees',           desc: 'Policy administration fees' },
  { name: 'TWK Assist / Bystand',  desc: 'Assistance and bystander cover' },
]

export default function Settings() {
  const { isAdmin } = useAuth()
  const { campuses } = useCampuses()
  const [rate, setRate] = useState(5)

  const handleSave = (e) => {
    e.preventDefault()
    toast.success('Settings saved')
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

        {/* Insurance Classes reference */}
        <Card>
          <CardHeader><CardTitle>Insurance Classes Reference</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    {['Class Name', 'Description'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {INSURANCE_CLASSES.map((c) => (
                    <tr key={c.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-nova-navy dark:text-white">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{c.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Campus management shortcut */}
        {isAdmin && (
          <Card>
            <CardHeader><CardTitle>Campus & Location Management</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Campus and sub-campus management has moved to its own dedicated page for a better experience.
              </p>
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex-1">
                  <p className="font-semibold text-nova-navy dark:text-white text-sm">Campuses & Locations</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {campuses.length} campuses registered · Add, edit, and manage campuses and their sub-campuses
                  </p>
                </div>
                <Link to="/locations">
                  <Button size="sm" variant="outline">
                    <ExternalLink size={14} /> Manage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

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
