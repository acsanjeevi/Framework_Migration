import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle2, AlertCircle, AlertTriangle, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompletedFileResult } from '@/types/api'

// ─── helpers ────────────────────────────────────────────────────────────────

function pct(value: number | undefined, threshold: number) {
  if (value === undefined) return <Minus className="h-3.5 w-3.5 text-white/20" />
  const passes = value >= threshold
  return (
    <span className={cn('tabular-nums font-medium text-xs', passes ? 'text-emerald-400' : 'text-amber-400')}>
      {value.toFixed(1)}%
    </span>
  )
}

function confidence(value: number | undefined) {
  if (value === undefined) return <Minus className="h-3.5 w-3.5 text-white/20" />
  const cls =
    value >= 0.85 ? 'text-emerald-400' :
    value >= 0.60 ? 'text-amber-400'   : 'text-red-400'
  return <span className={cn('tabular-nums font-medium text-xs', cls)}>{Math.round(value * 100)}%</span>
}

// ─── component ──────────────────────────────────────────────────────────────

interface Props {
  files: CompletedFileResult[]
}

export default function MigrationSummaryTable({ files }: Props) {
  return (
    <div className="rounded-xl border border-white/[0.07] overflow-x-auto bg-white/[0.02]">
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.07] hover:bg-transparent">
            <TableHead className="w-[200px] text-white/40 text-xs">File</TableHead>
            <TableHead className="text-white/40 text-xs">Status</TableHead>
            <TableHead className="text-white/40 text-xs">Framework</TableHead>
            <TableHead className="text-white/40 text-xs">Pattern</TableHead>
            <TableHead className="text-white/40 text-xs">Model</TableHead>
            <TableHead className="text-right text-white/40 text-xs">Confidence</TableHead>
            <TableHead className="text-right text-white/40 text-xs">Line&nbsp;Cov.</TableHead>
            <TableHead className="text-right text-white/40 text-xs">Branch&nbsp;Cov.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file, i) => {
            const isLowConf = file.agentUsed?.includes('low-confidence')
            return (
            <TableRow
              key={`${i}-${file.fileName}`}
              className={cn(
                'border-white/[0.04]',
                file.status === 'complete' && !isLowConf && 'hover:bg-emerald-500/[0.04]',
                isLowConf   && 'hover:bg-amber-500/[0.04] bg-amber-500/[0.02]',
                file.status === 'failed'   && 'hover:bg-red-500/[0.04] bg-red-500/[0.02]',
              )}
            >
              {/* File name */}
              <TableCell className="font-mono text-xs font-medium max-w-[200px] truncate text-white/70" title={file.fileName}>
                {file.fileName}
              </TableCell>

              {/* Status */}
              <TableCell>
                {file.status === 'complete' ? (
                  isLowConf ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                      <AlertTriangle className="h-3 w-3" /> Low Conf.
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Complete
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/20">
                    <AlertCircle className="h-3 w-3" /> Failed
                  </span>
                )}
              </TableCell>

              {/* Detected framework */}
              <TableCell className="text-xs text-white/50 capitalize">
                {file.detectedFramework ?? <Minus className="h-3.5 w-3.5 text-white/20" />}
              </TableCell>

              {/* Detected pattern */}
              <TableCell className="text-xs text-white/40">
                {file.detectedPattern ?? <Minus className="h-3.5 w-3.5 text-white/20" />}
              </TableCell>

              {/* Model */}
              <TableCell className="font-mono text-xs text-white/30">
                {file.agentUsed?.replace(' ⚠ low-confidence', '') ?? <Minus className="h-3.5 w-3.5 text-white/20" />}
              </TableCell>

              {/* Confidence */}
              <TableCell className="text-right">{confidence(file.confidence)}</TableCell>

              {/* Coverage */}
              <TableCell className="text-right">
                {file.coverage ? pct(file.coverage.linePct, 90) : <Minus className="h-3.5 w-3.5 text-white/20 inline" />}
              </TableCell>
              <TableCell className="text-right">
                {file.coverage ? pct(file.coverage.branchPct, 85) : <Minus className="h-3.5 w-3.5 text-white/20 inline" />}
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  )
}
