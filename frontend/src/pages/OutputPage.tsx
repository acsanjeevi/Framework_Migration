import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import CodePreview from '@/components/output/CodePreview'
import SelfHealAnnotations from '@/components/output/SelfHealAnnotations'
import CICDPreview from '@/components/output/CICDPreview'
import CoverageReport from '@/components/output/CoverageReport'
import DownloadButton from '@/components/output/DownloadButton'
import FolderTree from '@/components/workspace/FolderTree'
import { useMigrationStore } from '@/store/migrationStore'
import { MOCK_BATCH_RESULT } from '@/mock/mockData'
import { cn } from '@/lib/utils'
import type { CompletedFileResult } from '@/types/api'

function FileTabLabel({ file }: { file: CompletedFileResult }) {
  return (
    <span className="flex items-center gap-1.5">
      {file.status === 'complete'
        ? <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
        : <AlertCircle   className="h-3 w-3 text-red-500 shrink-0" />}
      <span className="truncate max-w-[120px]">{file.fileName}</span>
    </span>
  )
}

export default function OutputPage() {
  const navigate   = useNavigate()
  const phase      = useMigrationStore(s => s.phase)
  const mockMode   = useMigrationStore(s => s.mockMode)
  const jobId      = useMigrationStore(s => s.jobId)
  const batchResult = useMigrationStore(s => s.batchResult)
  const setBatch   = useMigrationStore(s => s.setBatchResult)

  // In mock mode, hydrate the result if not already set
  useEffect(() => {
    if (mockMode && !batchResult) {
      setBatch(MOCK_BATCH_RESULT)
    }
  }, [mockMode, batchResult, setBatch])

  // Redirect if arrived here with no job at all
  useEffect(() => {
    if (phase === 'idle') navigate('/upload', { replace: true })
  }, [phase, navigate])

  const result = batchResult ?? (mockMode ? MOCK_BATCH_RESULT : null)

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-sm text-muted-foreground">
          No output available yet.{' '}
          <button className="underline" onClick={() => navigate('/upload')}>Start a migration</button>.
        </p>
      </div>
    )
  }

  const completeFiles = result.files.filter(f => f.status === 'complete')
  const failedFiles   = result.files.filter(f => f.status === 'failed')
  const defaultTab    = result.files[0]?.fileName

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Migration Output</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {completeFiles.length} of {result.files.length} files migrated successfully
            {failedFiles.length > 0 && ` · ${failedFiles.length} failed`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DownloadButton jobId={jobId ?? result.batchId} mockMode={mockMode} />
          <Button variant="outline" size="sm" onClick={() => navigate('/summary')} className="gap-1">
            Summary <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* File tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {result.files.map(file => (
            <TabsTrigger key={file.fileName} value={file.fileName} className="text-xs">
              <FileTabLabel file={file} />
            </TabsTrigger>
          ))}
        </TabsList>

        {result.files.map(file => (
          <TabsContent key={file.fileName} value={file.fileName} className="mt-4 space-y-5">
            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant={file.status === 'complete' ? 'default' : 'destructive'}>
                {file.status === 'complete' ? 'Complete' : 'Failed'}
              </Badge>
              {file.detectedFramework && (
                <Badge variant="secondary">{file.detectedFramework}</Badge>
              )}
              {file.detectedPattern && (
                <Badge variant="secondary">{file.detectedPattern}</Badge>
              )}
              {file.agentUsed && (
                <Badge variant="outline" className="font-mono">{file.agentUsed}</Badge>
              )}
            </div>

            {/* Failed state */}
            {file.status === 'failed' && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{file.errorReason ?? 'Migration failed — manual review required.'}</span>
              </div>
            )}

            {/* Migrated code */}
            {file.healedCode && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold">Migrated Code</h2>
                <CodePreview code={file.healedCode} />
              </section>
            )}

            {/* Self-heal annotations */}
            {file.healedCode && (
              <>
                <Separator />
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    Self-Healing Annotations
                  </h2>
                  <SelfHealAnnotations code={file.healedCode} />
                </section>
              </>
            )}

            {/* CI/CD Pipeline */}
            {file.cicdYaml && file.cicdFileName && (
              <>
                <Separator />
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold">CI/CD Pipeline</h2>
                  <CICDPreview yaml={file.cicdYaml} fileName={file.cicdFileName} />
                </section>
              </>
            )}

            {/* Coverage */}
            {file.coverage && (
              <>
                <Separator />
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold">Coverage Report</h2>
                  <div className={cn('max-w-sm')}>
                    <CoverageReport
                      coverage={file.coverage}
                      confidence={file.confidence}
                      agentUsed={file.agentUsed}
                    />
                  </div>
                </section>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* OUTPUT folder tree — workspace/OUTPUT/<jobId> on the server */}
      {result.outputFolder && result.outputFolder.length > 0 && (
        <>
          <Separator />
          <FolderTree
            nodes={result.outputFolder}
            label="workspace / OUTPUT — migrated files on server"
          />
        </>
      )}
    </div>
  )
}

