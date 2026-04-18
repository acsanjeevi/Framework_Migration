import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { FileCode, AlertCircle, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileProgress } from '@/types/api'

const STATUS_CONFIG = {
  queued: {
    icon: Clock,
    badge: 'secondary' as const,
    label: 'Queued',
    barClass: '',
  },
  'in-progress': {
    icon: ChevronRight,
    badge: 'outline' as const,
    label: 'In Progress',
    barClass: '[&>div]:bg-amber-500',
  },
  complete: {
    icon: CheckCircle2,
    badge: 'default' as const,
    label: 'Complete',
    barClass: '[&>div]:bg-green-500',
  },
  failed: {
    icon: AlertCircle,
    badge: 'destructive' as const,
    label: 'Failed',
    barClass: '[&>div]:bg-red-500',
  },
}

interface Props {
  file: FileProgress
}

export default function FileProgressItem({ file }: Props) {
  const cfg = STATUS_CONFIG[file.status]
  const Icon = cfg.icon

  return (
    <div className={cn(
      'rounded-md border bg-card p-4 space-y-3 transition-colors',
      file.status === 'complete' && 'border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/20',
      file.status === 'failed'   && 'border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/20',
    )}>
      {/* Top row: file name + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium truncate" title={file.fileName}>
            {file.fileName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Icon className={cn(
            'h-3.5 w-3.5',
            file.status === 'complete'    && 'text-green-600',
            file.status === 'failed'      && 'text-red-500',
            file.status === 'in-progress' && 'text-amber-500',
            file.status === 'queued'      && 'text-muted-foreground',
          )} />
          <Badge variant={cfg.badge} className="text-[10px] py-0">
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {file.status === 'queued'
              ? 'Waiting…'
              : file.status === 'failed'
              ? `Failed at step ${file.currentStep}`
              : file.currentStepName}
          </span>
          <span className="tabular-nums font-medium">{file.percentage}%</span>
        </div>
        <Progress
          value={file.percentage}
          className={cn('h-1.5', cfg.barClass)}
        />
      </div>

      {/* Agent + metrics row */}
      {(file.agentUsed || file.confidenceScore !== null || file.lineCoverage !== null) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {file.agentUsed && (
            <span>
              <span className="font-medium text-foreground">{file.agentUsed}</span>
            </span>
          )}
          {file.confidenceScore !== null && (
            <span>
              Confidence:{' '}
              <span className={cn(
                'font-medium',
                (file.confidenceScore ?? 0) >= 0.8 ? 'text-green-600' :
                (file.confidenceScore ?? 0) >= 0.5 ? 'text-amber-500' : 'text-red-500'
              )}>
                {Math.round((file.confidenceScore ?? 0) * 100)}%
              </span>
            </span>
          )}
          {file.lineCoverage !== null && (
            <span>
              Line:{' '}
              <span className={cn(
                'font-medium',
                (file.lineCoverage ?? 0) >= 90 ? 'text-green-600' : 'text-amber-500'
              )}>
                {file.lineCoverage?.toFixed(1)}%
              </span>
            </span>
          )}
          {file.branchCoverage !== null && (
            <span>
              Branch:{' '}
              <span className={cn(
                'font-medium',
                (file.branchCoverage ?? 0) >= 85 ? 'text-green-600' : 'text-amber-500'
              )}>
                {file.branchCoverage?.toFixed(1)}%
              </span>
            </span>
          )}
        </div>
      )}

      {/* Error reason */}
      {file.status === 'failed' && file.errorReason && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{file.errorReason}</span>
        </div>
      )}
    </div>
  )
}
