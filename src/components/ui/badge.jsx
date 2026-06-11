import { cn } from '@/lib/utils'
import { cva } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-nova-green/20 text-nova-navy dark:text-nova-green',
        secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
        destructive: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        teal: 'bg-nova-teal/20 text-nova-teal',
        orange: 'bg-nova-orange/20 text-nova-orange',
        outline: 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
