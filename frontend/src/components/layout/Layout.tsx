import { Outlet, NavLink } from 'react-router-dom'
import { Upload, Activity, FileCode2, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import SettingsDialog from './SettingsDialog'
import { useState } from 'react'
import { useMigrationStore, selectOverallProgress } from '@/store/migrationStore'

const NAV_ITEMS = [
  { to: '/upload',   icon: Upload,    label: 'Upload'   },
  { to: '/progress', icon: Activity,  label: 'Progress' },
  { to: '/output',   icon: FileCode2, label: 'Output'   },
  { to: '/summary',  icon: BarChart3, label: 'Summary'  },
]

export default function Layout() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const phase   = useMigrationStore(s => s.phase)
  const files   = useMigrationStore(s => s.files)
  const overall = selectOverallProgress(files)
  const isProcessing = phase === 'processing' || phase === 'uploading'

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-56 flex flex-col border-r border-border bg-card shrink-0">
        {/* Logo / brand */}
        <div className="px-4 py-5">
          <h1 className="text-sm font-bold tracking-tight leading-tight text-foreground">
            Migration<br />
            <span className="text-muted-foreground font-normal">Agentic Tool</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">v1.0 · Hackathon</p>
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {/* Pulsing dot on Progress item while migration is running */}
              {to === '/progress' && isProcessing && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              )}
            </NavLink>
          ))}
        </nav>

        <Separator />

        {/* Settings button */}
        <div className="px-2 py-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4 shrink-0" />
            LLM Settings
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              AI-Powered Test Migration
            </h2>
            <p className="text-xs text-muted-foreground">
              Playwright · Self-Healing · CI/CD · Coverage Enforcement
            </p>
          </div>
          <span className="text-xs text-muted-foreground">Phase 1 · Hackathon 2026</span>
          {/* Live migration status badge */}
          {isProcessing && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-700 font-medium dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Migrating… {overall}%
            </span>
          )}
          {phase === 'complete' && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-green-300 bg-green-50 text-green-700 font-medium dark:bg-green-950/40 dark:text-green-300 dark:border-green-700">
              ✓ Migration complete
            </span>
          )}
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
