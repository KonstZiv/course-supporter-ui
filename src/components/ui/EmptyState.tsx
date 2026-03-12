import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-navy-pale flex items-center justify-center mb-5">
        <Icon size={28} className="text-navy" />
      </div>
      <h3 className="font-display text-xl text-ink mb-2">{title}</h3>
      <p className="text-ink-muted text-body max-w-sm mb-6">{description}</p>
      {action}
    </div>
  )
}
