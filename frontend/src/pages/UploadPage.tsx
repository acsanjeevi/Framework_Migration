import { useState } from 'react'
import { AlertTriangle, ArrowRight, Sparkles, ShieldCheck, GitBranch, Layers } from 'lucide-react'
import FrameworkSelector from '@/components/upload/FrameworkSelector'
import TargetLanguageSelector from '@/components/upload/TargetLanguageSelector'
import CICDSelector from '@/components/upload/CICDSelector'
import FileUploadZone from '@/components/upload/FileUploadZone'
import MigrateButton from '@/components/upload/MigrateButton'
import FolderTree from '@/components/workspace/FolderTree'
import { useMigrationStore } from '@/store/migrationStore'
import { useMigration } from '@/hooks/useMigration'
import type { SourceFramework, TargetLanguage, CICDPlatform } from '@/types/api'

const FEATURES = [
  { icon: Sparkles,    label: 'AI-Powered',     desc: 'LLM code transformation with 85%+ confidence gate' },
  { icon: ShieldCheck, label: 'Self-Healing',    desc: '6-level selector fallback chains auto-generated'   },
  { icon: GitBranch,   label: 'CI/CD Ready',     desc: 'Azure, GitLab & Jenkins pipelines generated'       },
  { icon: Layers,      label: 'Coverage Report', desc: 'Istanbul static analysis with thresholds enforced' },
]

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [sourceFramework, setSourceFramework] = useState<SourceFramework | ''>('')
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage | ''>('typescript')
  const [cicdPlatform, setCicdPlatform] = useState<CICDPlatform | ''>('azure')

  const mockMode = useMigrationStore(s => s.mockMode)
  const setMockMode = useMigrationStore(s => s.setMockMode)
  const phase = useMigrationStore(s => s.phase)
  const inputFolder = useMigrationStore(s => s.inputFolder)

  const { migrate } = useMigration()

  const loading = phase === 'uploading' || phase === 'processing'

  const canSubmit =
    !!sourceFramework &&
    !!targetLanguage &&
    !!cicdPlatform &&
    (mockMode || files.length > 0)

  function handleSubmit() {
    if (!sourceFramework || !targetLanguage || !cicdPlatform) return
    migrate(mockMode ? [] : files, { sourceFramework, targetLanguage, cicdPlatform })
  }

  return (
    <div className="min-h-full p-6 lg:p-8">
      {/* Hero header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-xs font-medium mb-4">
          <Sparkles className="h-3 w-3" />
          AI-Powered Test Migration
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Migrate Your Test Suite</h1>
        <p className="text-slate-500 mt-2 text-sm max-w-xl">
          Transform Cypress, Selenium, WebdriverIO and more into production-ready Playwright TypeScript â€” 
          with self-healing selectors, CI/CD pipelines and coverage enforcement.
        </p>
      </div>

      {/* Feature pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {FEATURES.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
            <div className="h-7 w-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-700">{label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mock mode banner */}
      {mockMode && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm text-amber-600 mb-6">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            <strong className="text-amber-700">Demo Mode Active</strong> â€” 3 sample test files will be migrated using 
            simulated AI agents. No real API calls are made.
          </span>
        </div>
      )}

      {/* Config + Upload grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Configuration â€” 2 cols */}
        <div className="lg:col-span-2 space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Configuration</p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-5">
            <FrameworkSelector value={sourceFramework} onChange={setSourceFramework} />
            <TargetLanguageSelector value={targetLanguage} onChange={setTargetLanguage} />
            <CICDSelector value={cicdPlatform} onChange={setCicdPlatform} />
          </div>
        </div>

        {/* File upload â€” 3 cols */}
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Test Files</p>
          {mockMode ? (
            <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <Layers className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">File upload disabled in demo mode</p>
              <p className="text-xs text-slate-400 mt-1">3 sample Cypress files will be used automatically</p>
            </div>
          ) : (
            <FileUploadZone files={files} onChange={setFiles} />
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <MigrateButton
          disabled={!canSubmit}
          loading={loading}
          mockMode={mockMode}
          onMockToggle={() => setMockMode(!mockMode)}
          onSubmit={handleSubmit}
        />
        {canSubmit && !loading && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <ArrowRight className="h-3 w-3" />
            {mockMode ? '3 demo files' : `${files.length} file${files.length !== 1 ? 's' : ''} ready`}
          </span>
        )}
      </div>

      {/* INPUT folder tree */}
      {inputFolder && inputFolder.length > 0 && (
        <div className="mt-6">
          <FolderTree nodes={inputFolder} label="workspace / INPUT â€” extracted source files" />
        </div>
      )}
    </div>
  )
}
