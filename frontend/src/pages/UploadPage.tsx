import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import FrameworkSelector from '@/components/upload/FrameworkSelector'
import TargetLanguageSelector from '@/components/upload/TargetLanguageSelector'
import CICDSelector from '@/components/upload/CICDSelector'
import FileUploadZone from '@/components/upload/FileUploadZone'
import MigrateButton from '@/components/upload/MigrateButton'
import { useMigrationStore } from '@/store/migrationStore'
import { useMigration } from '@/hooks/useMigration'
import type { SourceFramework, TargetLanguage, CICDPlatform } from '@/types/api'

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [sourceFramework, setSourceFramework] = useState<SourceFramework | ''>('')
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage | ''>('typescript')
  const [cicdPlatform, setCicdPlatform] = useState<CICDPlatform | ''>('azure')

  const mockMode = useMigrationStore(s => s.mockMode)
  const setMockMode = useMigrationStore(s => s.setMockMode)
  const phase = useMigrationStore(s => s.phase)

  const { migrate } = useMigration()

  const loading = phase === 'uploading' || phase === 'processing'

  const canSubmit =
    !!sourceFramework &&
    !!targetLanguage &&
    !!cicdPlatform &&
    (mockMode || files.length > 0)

  function handleSubmit() {
    if (!sourceFramework || !targetLanguage || !cicdPlatform) return
    migrate(
      mockMode ? [] : files,
      { sourceFramework, targetLanguage, cicdPlatform }
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Migrate Tests</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload your existing test files and configure the migration target.
        </p>
      </div>

      {/* Mock mode banner */}
      {mockMode && (
        <div className="flex items-start gap-3 rounded-md border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            <strong>Demo Mode</strong> — 3 sample test files will be migrated using simulated AI agents.
            No real API calls are made.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left: Configuration */}
        <div className="space-y-5">
          <FrameworkSelector
            value={sourceFramework}
            onChange={setSourceFramework}
          />
          <TargetLanguageSelector
            value={targetLanguage}
            onChange={setTargetLanguage}
          />
          <CICDSelector
            value={cicdPlatform}
            onChange={setCicdPlatform}
          />
        </div>

        {/* Right: File upload (hidden in mock mode) */}
        <div className="space-y-4">
          {mockMode ? (
            <div className="flex flex-col items-center justify-center h-full rounded-md border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                File upload is disabled in demo mode.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                3 sample files will be used automatically.
              </p>
            </div>
          ) : (
            <FileUploadZone files={files} onChange={setFiles} />
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-2">
        <MigrateButton
          disabled={!canSubmit}
          loading={loading}
          mockMode={mockMode}
          onMockToggle={() => setMockMode(!mockMode)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

