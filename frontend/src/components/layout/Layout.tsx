import { Outlet, NavLink } from 'react-router-dom'
import { Upload, Activity, FileCode2, BarChart3, Settings, Zap, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import SettingsDialog from './SettingsDialog'
import { useState } from 'react'
import { useMigrationStore, selectOverallProgress } from '@/store/migrationStore'

const NAV_ITEMS = [
  { to: '/upload',   icon: Upload,    label: 'Upload',   desc: 'Add test files' },
  { to: '/progress', icon: Activity,  label: 'Progress', desc: 'Live status'    },
  { to: '/output',   icon: FileCode2, label: 'Output',   desc: 'View results'   },
  { to: '/summary',  icon: BarChart3, label: 'Summary',  desc: 'Analytics'      },
]

export default function Layout() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const phase   = useMigrationStore(s => s.phase)
  const files   = useMigrationStore(s => s.files)
  const overall = selectOverallProgress(files)
  const isProcessing = phase === 'processing' || phase === 'uploading'

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-foreground overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-60 flex flex-col shrink-0 border-r border-white/[0.06] bg-gradient-to-b from-[#0f0f1a] to-[#0a0a12]">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/40">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">MigrateAI</p>
              <p className="text-[10px] text-white/40 font-medium tracking-wide uppercase">Agentic Testing Tool</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-white/30">v1.0 · Hackathon 2026</span>
          </div>
        </div>

        <div className="mx-4 h-px bg-white/[0.06]" />

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, desc }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/30 to-purple-600/20 text-white border border-violet-500/30 shadow-sm'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    isActive ? 'bg-violet-500/20 text-violet-300' : 'text-white/30 group-hover:text-white/60'
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium text-sm leading-none', isActive ? 'text-white' : '')}>{label}</p>
                    <p className="text-[10px] mt-0.5 text-white/30 leading-none">{desc}</p>
                  </div>
                  {to === '/progress' && isProcessing && (
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  )}
                  {isActive && <ChevronRight className="h-3 w-3 text-violet-400 shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mx-4 h-px bg-white/[0.06]" />

        {/* Settings */}
        <div className="px-3 py-4">
          <button
            onClick={() => setSettingsOpen(true)}
            className="group flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-all"
          >
            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white/30 group-hover:text-white/60">
              <Settings className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium">LLM Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 bg-[#0c0c14]">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] bg-[#0f0f1a]/80 backdrop-blur-sm shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white/90">
              AI-Powered Test Migration Platform
            </h2>
            <p className="text-[11px] text-white/30 mt-0.5">
              Playwright · Self-Healing · CI/CD · Coverage Enforcement
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 font-medium animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Migrating… {overall}%
              </span>
            )}
            {phase === 'complete' && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Migration complete
              </span>
            )}
            <span className="text-[10px] text-white/20 ml-2">Phase 1 · Hackathon 2026</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
