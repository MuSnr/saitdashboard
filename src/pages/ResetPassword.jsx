import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { resetPassword, getApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
      toast.success('Password reset! Redirecting to login…')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-nova-navy rounded-xl flex items-center justify-center font-bold text-nova-green text-sm">SA</div>
          <span className="text-nova-navy dark:text-white font-bold text-xl">SAIT</span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-nova-green/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={28} className="text-nova-green" />
              </div>
              <h2 className="text-xl font-bold text-nova-navy dark:text-white">Password updated!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecting you to Sign In…</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-nova-navy dark:text-white mb-1">Set New Password</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Choose a strong password (min. 8 characters).
                </p>
              </div>

              {error && (
                <div className="mb-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                  <AlertCircle size={17} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      className="h-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <Input
                    id="confirm"
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-400">
                Remember it?{' '}
                <Link to="/login" className="text-nova-teal hover:underline">
                  Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
