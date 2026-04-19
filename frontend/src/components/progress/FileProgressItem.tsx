import { Progress } from '@/components/ui/progress'
import { FileCode, AlertCircle, CheckCircle2, Clock, ChevronRight, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileProgress } from '@/types/api'

export default function FileProgressItem({ file }: { file: FileProgress }) {
  const isLowConf = file.agentUsed?.includes('low-confidence')

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3 transition-colors',
      file.status === 'complete' && !isLowConf && 'border-emerald-500/20 bg-emerald-500/[0.04]',
      isLowConf                  && 'border-amber-500/20 bg-amber-500/[0.04]',
      file.status === 'failed'   && 'border-red-500/20 bg-red-500/[0.04]',
      file.status === 'queued'   && 'border-white/[0.07] bg-white/[0.02]',
      file.status === 'in-progress' && 'border-violet-500/25 bg-violet-500/[0.04]',
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="h-4 w-4 shrink-0 text-white/30" />
          <span className="text-sm font-medium text-white/80 truncate" title={file.fileName}>
            {file.fileName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {file.status === 'complete' && !isLowConf && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
          {isLowConf   && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
          {file.status === 'failed'      && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
          {file.status === 'in-progress' && <ChevronRight className="h-3.5 w-3.5 text-violet-400 animate-pulse" />}
          {file.status === 'queued'      && <Clock className="h-3.5 w-3.5 text-white/25" />}
          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border',
            file.status === 'complete' && !isLowConf && 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
            isLowConf   && 'text-amber-300 border-amber-500/30 bg-amber-500/10',
            file.status === 'failed'      && 'text-red-300 border-red-500/30 bg-red-500/10',
            file.status === 'in-progress' && 'text-violet-300 border-violet-500/30 bg-violet-500/10',
            file.status === 'queued'      && 'text-white/30 border-white/[0.08] bg-white/[0.04]',
          )}>
            {file.status === 'complete' ? (isLowConf ? 'Low Conf.' : 'Complete') :
             file.status === 'in-progress' ? 'In Progress' :
             file.status === 'failed' ? 'Failed' : 'Queued'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-white/30">
          <span>
            {file.status === 'queued' ? 'Waiting in queueâ€¦' :
             file.status === 'failed' ? `Failed at step ${file.currentStep}` :
             file.currentStepName}
          </span>
          <span className="tabular-nums font-medium text-white/50">{file.percentage}%</span>
        </div>
        <Progress
          value={file.percentage}
          className={cn('h-1.5 bg-white/[0.06]',
            file.status === 'complete' && !isLowConf && '[&>div]:bg-emerald-500',
            isLowConf   && '[&>div]:bg-amber-500',
            file.status === 'failed'      && '[&>div]:bg-red-500',
            file.status === 'in-progress' && '[&>div]:bg-violet-500',
          )}
        />
      </div>

      {/* Agent + metrics row */}
      {(file.agentUsed || file.confidenceScore !== null || file.lineCoverage !== null) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/30">
          {file.agentUsed && (
            <span className="font-mono text-white/25">{file.agentUsed.replace(' âš  low-confidence', '')}</span>
          )}
          {file.confidenceScore !== null && (
            <span>Confidence:{' '}
              <span className={cn('font-medium',
                (file.confidenceScore ?? 0) >= 0.85 ? 'text-emerald-400' :
                (file.confidenceScore ?? 0) >= 0.60 ? 'text-amber-400' : 'text-red-400'
              )}>{Math.round((file.confidenceScore ?? 0) * 100)}%</span>
            </span>
          )}
          {file.lineCoverage !== null && (
            <span>Line: <span className={cn('font-medium', (file.lineCoverage ?? 0) >= 90 ? 'text-emerald-400' : 'text-amber-400')}>
              {file.lineCoverage?.toFixed(1)}%
            </span></span>
          )}
          {file.branchCoverage !== null && (
            <span>Branch: <span className={cn('font-medium', (file.branchCoverage ?? 0) >= 85 ? 'text-emerald-400' : 'text-amber-400')}>
              {file.branchCoverage?.toFixed(1)}%
            </span></span>
          )}
        </div>
      )}

      {/* Error reason */}
      {file.status === 'failed' && file.errorReason && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/15 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300/80">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" />
          <span>{file.errorReason}</span>
        </div>
      )}
    </div>
  )
}
