import { Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export default function NotFound() {
  const location = useLocation()

  useEffect(() => {
    console.error('404: attempted to access', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 gap-6">
      <div className="text-center">
        <p className="text-8xl font-bold text-nova-green mb-4">404</p>
        <h1 className="text-2xl font-bold text-nova-navy dark:text-white mb-2">Page not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The route <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-sm">{location.pathname}</code> doesn't exist.
        </p>
        <Button asChild>
          <Link to="/"><Home size={16} /> Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
