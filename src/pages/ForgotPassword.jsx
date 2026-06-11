import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword, getApiError } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-nova-navy rounded-xl flex items-center justify-center font-bold text-nova-green text-sm">SA</div>
          <span className="text-nova-navy dark:text-white font-bold text-xl">SAIT</span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-nova-green/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={28} className="text-nova-green" />
              </div>
              <h2 className="text-xl font-bold text-nova-navy dark:text-white">Check your inbox</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly. Check your spam folder too.
              </p>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-nova-teal hover:underline mt-4"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-nova-navy dark:text-white mb-1">Forgot Password</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Enter your email and we'll send you a reset link.
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
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@novapioneer.co.za"
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Sending…</>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-nova-teal hover:underline">
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
