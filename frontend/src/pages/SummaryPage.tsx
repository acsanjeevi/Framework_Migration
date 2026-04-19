import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle, ArrowLeft, Trophy, TrendingUp, Target, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MigrationSummaryTable from '@/components/summary/MigrationSummaryTable'
import { useMigrationStore } from '@/store/migrationStore'
import { MOCK_BATCH_RESULT } from '@/mock/mockData'
import { cn } from '@/lib/utils'

function StatCard({ label, value, sub, accent, icon: Icon }: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'red' | 'amber'
  icon: React.ElementType
}) {
  const styles = {
    green: { value: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400' },
    red:   { value: 'text-red-300',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: 'text-red-400' },
    amber: { value: 'text-amber-300',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'text-amber-400' },
  }
  const s = styles[accent ?? 'green']
  return (
    <div className={cn('rounded-xl border p-5 space-y-2', s.bg, s.border)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</p>
        <div className={cn('h-6 w-6 rounded-md flex items-center justify-center', s.bg)}>
          <Icon className={cn('h-3.5 w-3.5', s.icon)} />
        </div>
      </div>
      <p className={cn('text-3xl font-bold tabular-nums', s.value)}>{value}</p>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Migration Summary</h1>
          <p className="text-xs text-white/30 mt-1">
            Job <span className="font-mono">{result.batchId}</span> · Completed {completedAt}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/output')}
            className="gap-1.5 border-white/[0.1] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white text-xs">
            <ArrowLeft className="h-3 w-3" /> Output
          </Button>
          <Button size="sm" onClick={() => { reset(); navigate('/upload') }}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
            New Migration
          </Button>
        </div>
      </div>

      {/* Config bar */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[['Source', cfg.sourceFramework], ['Target', `${cfg.targetLanguage} · Playwright`], ['CI/CD', cfg.cicdPlatform]].map(([k, v]) => (
          <span key={k} className="px-3 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] text-white/40">
            {k}: <span className="text-white/70 font-medium capitalize">{v}</span>
          </span>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Trophy}
          label="Files Processed"
          value={total}
          sub={`${complete} ok · ${failed} failed`}
          accent={failed === 0 ? 'green' : failed === total ? 'red' : 'amber'}
        />
        <StatCard icon={TrendingUp}
          label="Success Rate"
          value={`${Math.round((complete / total) * 100)}%`}
          accent={failed === 0 ? 'green' : failed === total ? 'red' : 'amber'}
        />
        <StatCard icon={Target}
          label="Avg Line Coverage"
          value={avgLine !== null ? `${avgLine.toFixed(1)}%` : '—'}
          sub="threshold 90%"
          accent={avgLine !== null ? (avgLine >= 90 ? 'green' : 'amber') : 'amber'}
        />
        <StatCard icon={Brain}
          label="Avg AI Confidence"
          value={avgConf !== null ? `${Math.round(avgConf * 100)}%` : '—'}
          accent={avgConf !== null ? (avgConf >= 0.8 ? 'green' : avgConf >= 0.5 ? 'amber' : 'red') : 'amber'}
        />
      </div>

      {/* Legend strip */}
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" /> {complete} file{complete !== 1 ? 's' : ''} migrated
        </span>
        {failed > 0 && (
          <span className="flex items-center gap-1.5 text-red-400">
            <AlertCircle className="h-3.5 w-3.5" /> {failed} file{failed !== 1 ? 's' : ''} failed — manual review required
          </span>
        )}
      </div>

      {/* Table */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Per-File Results</h2>
        <MigrationSummaryTable files={result.files} />
      </section>
    </div>
  )
}

