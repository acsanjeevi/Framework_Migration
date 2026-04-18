import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompletedFileResult } from '@/types/api'

// ─── helpers ────────────────────────────────────────────────────────────────

function pct(value: number | undefined, threshold: number) {
  if (value === undefined) return null
  const passes = value >= threshold
  return (
    <span className={cn('tabular-nums font-medium', passes ? 'text-green-600' : 'text-amber-500')}>
      {value.toFixed(1)}%
    </span>
  )
}

function confidence(value: number | undefined) {
  if (value === undefined) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  const cls =
    value >= 0.8 ? 'text-green-600' :
    value >= 0.5 ? 'text-amber-500' : 'text-red-500'
  return <span className={cn('tabular-nums font-medium', cls)}>{Math.round(value * 100)}%</span>
}

// ─── component ──────────────────────────────────────────────────────────────

interface Props {
  files: CompletedFileResult[]
}

export default function MigrationSummaryTable({ files }: Props) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="w-[200px]">File</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Framework</TableHead>
            <TableHead>Pattern</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Confidence</TableHead>
            <TableHead className="text-right">Line&nbsp;Cov.</TableHead>
            <TableHead className="text-right">Branch&nbsp;Cov.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map(file => (
            <TableRow
              key={file.fileName}
              className={cn(
                file.status === 'complete' && 'hover:bg-green-50/40 dark:hover:bg-green-950/20',
                file.status === 'failed'   && 'hover:bg-red-50/40 dark:hover:bg-red-950/20',
              )}
            >
              {/* File name */}
              <TableCell className="font-mono text-xs font-medium max-w-[200px] truncate" title={file.fileName}>
                {file.fileName}
              </TableCell>

              {/* Status */}
              <TableCell>
                {file.status === 'complete' ? (
                  <Badge className="gap-1 bg-green-100 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" /> Complete
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> Failed
                  </Badge>
                )}
              </TableCell>

              {/* Detected framework */}
              <TableCell className="text-sm capitalize">
                {file.detectedFramework ?? <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              </TableCell>

              {/* Detected pattern */}
              <TableCell className="text-sm text-muted-foreground">
                {file.detectedPattern ?? <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              </TableCell>

              {/* Model */}
              <TableCell className="font-mono text-xs text-muted-foreground">
                {file.agentUsed ?? <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              </TableCell>

              {/* Confidence */}
              <TableCell className="text-right">{confidence(file.confidence)}</TableCell>

              {/* Coverage */}
              <TableCell className="text-right">
                {file.coverage ? pct(file.coverage.linePct, 90) : <Minus className="h-3.5 w-3.5 text-muted-foreground inline" />}
              </TableCell>
              <TableCell className="text-right">
                {file.coverage ? pct(file.coverage.branchPct, 85) : <Minus className="h-3.5 w-3.5 text-muted-foreground inline" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
