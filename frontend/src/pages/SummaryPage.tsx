import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import MigrationSummaryTable from '@/components/summary/MigrationSummaryTable'
import { useMigrationStore } from '@/store/migrationStore'
import { MOCK_BATCH_RESULT } from '@/mock/mockData'

function StatCard({ label, value, sub, accent }: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'red' | 'amber'
}) {
  const colorMap = {
    green: 'text-green-600',
    red:   'text-red-500',
    amber: 'text-amber-500',
    undefined: 'text-foreground',
  }
  return (
    <div className="rounded-md border bg-card p-4 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colorMap[accent ?? 'undefined']}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export default function SummaryPage() {
  const navigate    = useNavigate()
  const phase       = useMigrationStore(s => s.phase)
  const mockMode    = useMigrationStore(s => s.mockMode)
  const batchResult = useMigrationStore(s => s.batchResult)
  const setBatch    = useMigrationStore(s => s.setBatchResult)
  const config      = useMigrationStore(s => s.config)
  const reset       = useMigrationStore(s => s.reset)

  // Hydrate mock data if needed
  useEffect(() => {
    if (mockMode && !batchResult) setBatch(MOCK_BATCH_RESULT)
  }, [mockMode, batchResult, setBatch])

  // Redirect if no job
  useEffect(() => {
    if (phase === 'idle') navigate('/upload', { replace: true })
  }, [phase, navigate])

  const result = batchResult ?? (mockMode ? MOCK_BATCH_RESULT : null)

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm text-muted-foreground">
          No summary available.{' '}
          <button className="underline" onClick={() => navigate('/upload')}>Start a migration</button>.
        </p>
      </div>
    )
  }

  const total     = result.files.length
  const complete  = result.files.filter(f => f.status === 'complete').length
  const failed    = result.files.filter(f => f.status === 'failed').length
  const coverageFiles = result.files.filter(f => f.coverage)
  const avgLine   = coverageFiles.length
    ? coverageFiles.reduce((s, f) => s + (f.coverage?.linePct ?? 0), 0) / coverageFiles.length
    : null
  const avgConf = result.files.filter(f => f.confidence !== undefined).length
    ? result.files.reduce((s, f) => s + (f.confidence ?? 0), 0) / result.files.filter(f => f.confidence !== undefined).length
    : null

  const completedAt = new Date(result.completedAt).toLocaleString()
  const cfg = config ?? result.config

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Migration Summary</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Job <span className="font-mono">{result.batchId}</span> · Completed {completedAt}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/output')} className="gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Output
          </Button>
          <Button size="sm" onClick={() => { reset(); navigate('/upload') }}>
            New Migration
          </Button>
        </div>
      </div>

      {/* Config bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground border rounded-md bg-muted/30 px-4 py-2.5">
        <span>Source: <span className="font-medium text-foreground capitalize">{cfg.sourceFramework}</span></span>
        <span>Target: <span className="font-medium text-foreground capitalize">{cfg.targetLanguage}</span> (Playwright)</span>
        <span>CI/CD: <span className="font-medium text-foreground capitalize">{cfg.cicdPlatform}</span></span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Files Processed"
          value={total}
          sub={`${complete} complete · ${failed} failed`}
        />
        <StatCard
          label="Success Rate"
          value={`${Math.round((complete / total) * 100)}%`}
          accent={failed === 0 ? 'green' : failed === total ? 'red' : 'amber'}
        />
        <StatCard
          label="Avg Line Coverage"
          value={avgLine !== null ? `${avgLine.toFixed(1)}%` : '—'}
          sub="threshold 90%"
          accent={avgLine !== null ? (avgLine >= 90 ? 'green' : 'amber') : undefined}
        />
        <StatCard
          label="Avg AI Confidence"
          value={avgConf !== null ? `${Math.round(avgConf * 100)}%` : '—'}
          accent={avgConf !== null ? (avgConf >= 0.8 ? 'green' : avgConf >= 0.5 ? 'amber' : 'red') : undefined}
        />
      </div>

      {/* Pass / Fail legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> {complete} file{complete !== 1 ? 's' : ''} migrated
        </span>
        {failed > 0 && (
          <span className="flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" /> {failed} file{failed !== 1 ? 's' : ''} failed — manual review required
          </span>
        )}
      </div>

      <Separator />

      {/* Table */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Per-File Results</h2>
        <MigrationSummaryTable files={result.files} />
      </section>
    </div>
  )
}

