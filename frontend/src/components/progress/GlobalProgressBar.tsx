import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface Props {
  percentage: number
  total: number
  complete: number
  failed: number
  inProgress: number
}

export default function GlobalProgressBar({ percentage, total, complete, failed, inProgress }: Props) {
  const allDone = complete + failed === total && total > 0

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Overall Progress</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {complete} complete · {failed > 0 ? `${failed} failed · ` : ''}{inProgress} in progress · {total} total
          </p>
        </div>
        <span className={cn(
          'text-2xl font-bold tabular-nums',
          allDone && failed === 0 ? 'text-green-600' : allDone && failed > 0 ? 'text-red-500' : 'text-foreground'
        )}>
          {percentage}%
        </span>
      </div>

      <Progress
        value={percentage}
        className={cn(
          'h-2.5',
          allDone && failed === 0 ? '[&>div]:bg-green-500' :
          allDone && failed > 0   ? '[&>div]:bg-red-500'   :
          '[&>div]:bg-primary'
        )}
      />

      {allDone && (
        <p className={cn(
          'text-xs font-medium',
          failed === 0 ? 'text-green-600' : 'text-red-500'
        )}>
          {failed === 0
            ? `All ${total} files migrated successfully.`
            : `${complete} of ${total} files migrated — ${failed} failed.`}
        </p>
      )}
    </div>
  )
}
