import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, AlertCircle, ArrowRight, Download, FileCode2, Wand2, GitBranch, BarChart3, AlertTriangle, FolderOpen, XCircle, Clock, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

/** Humanize an error reason into a user-friendly message with context */
function humanizeError(reason: string | undefined): { title: string; detail: string; hint: string } {
  if (!reason) return { title: 'Migration failed', detail: 'An unknown error occurred during processing.', hint: 'Check backend logs for details.' }
  if (reason.includes('429') || reason.toLowerCase().includes('rate limit')) {
    return {
      title: 'API Rate Limit Reached',
      detail: 'The AI provider throttled requests due to token-per-minute limits. This typically happens when processing many large files in parallel.',
      hint: 'The system will automatically retry. If this persists, try uploading fewer files at once or wait a few minutes before resubmitting.',
    }
  }
  if (reason.toLowerCase().includes('confidence') || reason.toLowerCase().includes('below')) {
    return {
      title: 'Low AI Confidence',
      detail: 'The AI model could not produce a high-confidence migration for this file. The source code may contain complex patterns or non-standard syntax.',
      hint: 'Review the file manually. You can edit the output code directly or use the self-healing annotations as a guide.',
    }
  }
  if (reason.toLowerCase().includes('api key') || reason.toLowerCase().includes('auth')) {
    return {
      title: 'API Authentication Failed',
      detail: 'The LLM provider rejected the API key.',
      hint: 'Check your API key in LLM Settings (sidebar bottom-left). Ensure it has sufficient quota.',
    }
  }
  if (reason.toLowerCase().includes('clarification')) {
    return {
      title: 'Ambiguous Source Code',
      detail: reason,
      hint: 'The AI detected ambiguity in the source file. Add comments or simplify complex patterns before re-migrating.',
    }
  }
  return {
    title: 'Step Failed',
    detail: reason,
    hint: 'This file requires manual review. Other files in the batch were processed normally.',
  }
}

function FileTabLabel({ file }: { file: CompletedFileResult }) {
  const isLowConf = file.agentUsed?.includes('low-confidence')
  return (
    <span className="flex items-center gap-1.5 max-w-[140px]">
      {file.status === 'complete'
        ? isLowConf
          ? <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
          : <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
        : <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
      <span className="truncate text-xs">{file.fileName}</span>
    </span>
  )
}

function SectionHeader({ icon: Icon, title, badge }: { icon: React.ElementType, title: string, badge?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-6 w-6 rounded-md bg-violet-500/15 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-violet-400" />
      </div>
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">{badge}</span>}
    </div>
  )
}

export default function OutputPage() {
  const navigate   = useNavigate()
  const phase      = useMigrationStore(s => s.phase)
  const mockMode   = useMigrationStore(s => s.mockMode)
  const jobId      = useMigrationStore(s => s.jobId)
  const batchResult = useMigrationStore(s => s.batchResult)
  const setBatch   = useMigrationStore(s => s.setBatchResult)
  const [activeSection, setActiveSection] = useState<string>('code')

  useEffect(() => {
    if (mockMode && !batchResult) setBatch(MOCK_BATCH_RESULT)
  }, [mockMode, batchResult, setBatch])

  useEffect(() => {
    if (phase === 'idle') navigate('/upload', { replace: true })
  }, [phase, navigate])

  const result = batchResult ?? (mockMode ? MOCK_BATCH_RESULT : null)

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <FileCode2 className="h-7 w-7 text-slate-300" />
        </div>
        <p className="text-slate-500 text-sm">No output available yet.</p>
        <button className="text-violet-600 text-sm mt-1 hover:underline" onClick={() => navigate('/upload')}>
          Start a migration â†’
        </button>
      </div>
    )
  }

  const completeFiles = result.files.filter(f => f.status === 'complete')
  const failedFiles   = result.files.filter(f => f.status === 'failed')
  const defaultTab    = result.files[0]?.fileName

  return (
    <div className="p-6 lg:p-8 min-h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Migration Output</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
              completeFiles.length > 0 ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-600 bg-red-500/10 border border-red-500/20'
            )}>
              <CheckCircle2 className="h-3 w-3" />
              {completeFiles.length} succeeded
            </span>
            {failedFiles.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-red-300 bg-red-500/10 border border-red-500/20">
                <XCircle className="h-3 w-3" />
                {failedFiles.length} failed
              </span>
            )}
            <span className="text-xs text-slate-400">{result.files.length} total files</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DownloadButton jobId={jobId ?? result.batchId} mockMode={mockMode} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/summary')}
            className="gap-1.5 border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-xs"
          >
            Summary <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Failed files banner */}
      {failedFiles.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700">
                {failedFiles.length} file{failedFiles.length !== 1 ? 's' : ''} could not be migrated
              </p>
              <p className="text-xs text-amber-600/70 mt-1">
                Common causes: API rate limits, low AI confidence, or unsupported source patterns.
                Click a failed file tab to see the specific reason and recommended action.
              </p>
              <p className="text-xs text-amber-300/50 mt-1">
                âœ“ Successfully migrated files are available for download. Failed files are excluded from the ZIP.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-0">
        <div className="overflow-x-auto pb-1 mb-4">
          <TabsList className="flex h-auto gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl w-max min-w-full">
            {result.files.map((file, i) => (
              <TabsTrigger
                key={`${i}-${file.fileName}`}
                value={file.fileName}
                className={cn(
                  'rounded-lg text-xs px-3 py-1.5 transition-all data-[state=active]:bg-violet-600/30 data-[state=active]:text-violet-700 data-[state=active]:border-violet-500/40 data-[state=active]:shadow-none',
                  'text-slate-500 hover:text-slate-700',
                  file.status === 'failed' && 'data-[state=active]:bg-red-600/20 data-[state=active]:border-red-500/30 data-[state=active]:text-red-700'
                )}
              >
                <FileTabLabel file={file} />
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {result.files.map((file, i) => {
          const isLowConf = file.agentUsed?.includes('low-confidence')
          const err = humanizeError(file.errorReason)

          return (
            <TabsContent key={`${i}-${file.fileName}`} value={file.fileName}>
              {/* File meta strip */}
              <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium',
                  file.status === 'complete' && !isLowConf ? 'bg-emerald-500/15 text-emerald-600' :
                  isLowConf ? 'bg-amber-500/15 text-amber-600' :
                  'bg-red-500/15 text-red-600'
                )}>
                  {file.status === 'complete' ? (isLowConf ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />) : <XCircle className="h-3 w-3" />}
                  {file.status === 'complete' ? (isLowConf ? 'Low Confidence' : 'Complete') : 'Failed'}
                </span>
                {file.detectedFramework && <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-500 capitalize">{file.detectedFramework}</span>}
                {file.detectedPattern && <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-500">{file.detectedPattern}</span>}
                {file.confidence !== undefined && (
                  <span className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-md',
                    file.confidence >= 0.85 ? 'bg-emerald-500/10 text-emerald-400' :
                    file.confidence >= 0.6  ? 'bg-amber-500/10 text-amber-400' :
                    'bg-red-500/10 text-red-400'
                  )}>
                    <Zap className="h-2.5 w-2.5" />
                    {Math.round(file.confidence * 100)}% confidence
                  </span>
                )}
                {file.agentUsed && (
                  <span className="text-[10px] px-2 py-1 rounded-md bg-slate-100 text-slate-400 font-mono">
                    {file.agentUsed.replace(' âš  low-confidence', '')}
                  </span>
                )}
              </div>

              {/* Low confidence warning */}
              {isLowConf && file.status === 'complete' && (
                <div className="mb-5 flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06]">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700">Human review recommended</p>
                    <p className="text-xs text-amber-300/60 mt-1">
                      AI confidence was below the 85% threshold for this file. The migration has been completed but 
                      some patterns may not be accurately converted. Please review the generated code before committing.
                    </p>
                  </div>
                </div>
              )}

              {/* Failed error card */}
              {file.status === 'failed' && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/[0.06] overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <div className="h-8 w-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-700">{err.title}</p>
                      <p className="text-xs text-red-300/70 mt-1 leading-relaxed">{err.detail}</p>
                    </div>
                  </div>
                  <div className="border-t border-red-500/10 bg-red-500/[0.04] px-4 py-3 flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300/70"><strong className="text-amber-300">Next step: </strong>{err.hint}</p>
                  </div>
                </div>
              )}

              {file.status === 'complete' && (
                <div className="space-y-6">
                  {/* Section selector */}
                  <div className="flex gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 w-fit">
                    {[
                      { key: 'code', icon: FileCode2, label: 'Code' },
                      { key: 'heal', icon: Wand2, label: 'Self-Heal' },
                      { key: 'cicd', icon: GitBranch, label: 'CI/CD' },
                      { key: 'cov', icon: BarChart3, label: 'Coverage' },
                    ].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => setActiveSection(key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                          activeSection === key
                            ? 'bg-violet-600/30 text-violet-700 border border-violet-500/30'
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Code */}
                  {activeSection === 'code' && file.healedCode && (
                    <div>
                      <SectionHeader icon={FileCode2} title="Migrated Code" badge={file.fileName.replace('.cy.ts', '.spec.ts')} />
                      <CodePreview code={file.healedCode} />
                    </div>
                  )}

                  {/* Self-heal */}
                  {activeSection === 'heal' && file.healedCode && (
                    <div>
                      <SectionHeader icon={Wand2} title="Self-Healing Annotations" />
                      <SelfHealAnnotations code={file.healedCode} />
                    </div>
                  )}

                  {/* CI/CD */}
                  {activeSection === 'cicd' && file.cicdYaml && file.cicdFileName && (
                    <div>
                      <SectionHeader icon={GitBranch} title="CI/CD Pipeline" badge={file.cicdFileName} />
                      <CICDPreview yaml={file.cicdYaml} fileName={file.cicdFileName} />
                    </div>
                  )}

                  {/* Coverage */}
                  {activeSection === 'cov' && file.coverage && (
                    <div>
                      <SectionHeader icon={BarChart3} title="Coverage Report" />
                      <div className="max-w-md">
                        <CoverageReport coverage={file.coverage} confidence={file.confidence} agentUsed={file.agentUsed?.replace(' âš  low-confidence', '')} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      {/* OUTPUT folder tree */}
      {result.outputFolder && result.outputFolder.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Server Output</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <FolderTree nodes={result.outputFolder} label="workspace / OUTPUT â€” migrated files" />
          </div>
        </div>
      )}
    </div>
  )
}
