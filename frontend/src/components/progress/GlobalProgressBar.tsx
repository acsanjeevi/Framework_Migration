import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface Props { percentage: number; total: number; complete: number; failed: number; inProgress: number }

export default function GlobalProgressBar({ percentage, total, complete, failed, inProgress }: Props) {
  const allDone = complete + failed === total && total > 0
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white/80">Overall Progress</p>
          <p className="text-xs text-white/30 mt-0.5">{complete} complete{failed > 0 ? ` · ${failed} failed` : ""} · {total} total</p>
        </div>
        <span className="text-3xl font-bold tabular-nums text-violet-300">{percentage}%</span>
      </div>
      <Progress value={percentage} className={cn("h-2 bg-white/[0.06]", allDone && failed === 0 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-violet-500")} />
      {allDone && <p className={cn("text-xs font-medium", failed === 0 ? "text-emerald-400" : "text-red-400")}>{failed === 0 ? `All ${total} migrated.` : `${complete}/${total} migrated, ${failed} failed.`}</p>}
    </div>
  )
}
