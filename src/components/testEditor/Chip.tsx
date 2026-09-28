import { clsx } from 'clsx'

export type Tone = 'neutral' | 'amber' | 'forest' | 'navy' | 'coral'

// The chip tones of the program's badges (SummaryBadge, ProjectBaseBadge).
const TONE: Record<Tone, string> = {
  neutral: 'bg-canvas-dark text-ink-muted',
  amber: 'bg-amber-pale text-amber-dark',
  forest: 'bg-forest-pale text-forest',
  navy: 'bg-navy-pale text-navy',
  coral: 'bg-coral-pale text-coral',
}

export function Chip({
  tone,
  title,
  pulse = false,
  children,
}: {
  tone: Tone
  title?: string
  pulse?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        TONE[tone],
        pulse && 'animate-pulse-soft',
      )}
    >
      {children}
    </span>
  )
}
