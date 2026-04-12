import { cn } from '@/lib/utils'
import type { CoveragePayload } from '@/types/api'

interface CoverageBarProps {
  label: string
  value: number
  threshold: number
}

function CoverageBar({ label, value, threshold }: CoverageBarProps) {
  const passes = value >= threshold
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', passes ? 'text-green-600' : 'text-amber-500')}>
          {value.toFixed(1)}%
          <span className="ml-1 text-muted-foreground font-normal">(min {threshold}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', passes ? 'bg-green-500' : 'bg-amber-500')}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

interface Props {
  coverage: CoveragePayload
  confidence?: number
  agentUsed?: string
}

export default function CoverageReport({ coverage, confidence, agentUsed }: Props) {
  return (
    <div className="space-y-4">
      <CoverageBar label="Line Coverage"   value={coverage.linePct}   threshold={90} />
      <CoverageBar label="Branch Coverage" value={coverage.branchPct} threshold={85} />
      {(confidence !== undefined || agentUsed) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground border-t pt-3">
          {confidence !== undefined && (
            <span>
              AI Confidence:{' '}
              <span className={cn(
                'font-medium',
                confidence >= 0.8 ? 'text-green-600' : confidence >= 0.5 ? 'text-amber-500' : 'text-red-500'
              )}>
                {Math.round(confidence * 100)}%
              </span>
            </span>
          )}
          {agentUsed && (
            <span>
              Model: <span className="font-medium text-foreground">{agentUsed}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
