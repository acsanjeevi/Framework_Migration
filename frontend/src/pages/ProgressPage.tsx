import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import GlobalProgressBar from '@/components/progress/GlobalProgressBar'
import FileProgressList from '@/components/progress/FileProgressList'
import { useMigrationStore, selectOverallProgress, selectStatusCounts } from '@/store/migrationStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { getSummary } from '@/api/migrate'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export default function ProgressPage() {
  const navigate = useNavigate()
  const [wsStatus, setWsStatus] = useState<WSStatus>('connecting')

  const jobId       = useMigrationStore(s => s.jobId)
  const phase       = useMigrationStore(s => s.phase)
  const mockMode    = useMigrationStore(s => s.mockMode)
  const files       = useMigrationStore(s => s.files)
  const setBatch    = useMigrationStore(s => s.setBatchResult)
  const handleEvent = useMigrationStore(s => s.handleProgressEvent)

  const overall = selectOverallProgress(files)
  const counts  = selectStatusCounts(files)

  // Redirect if no job started
  useEffect(() => {
    if (phase === 'idle') navigate('/upload', { replace: true })
  }, [phase, navigate])

  // Fetch summary & navigate to output when all done
  const fetchedRef = useRef(false)
  useEffect(() => {
    if (phase !== 'complete' || fetchedRef.current) return
    fetchedRef.current = true

    async function finish() {
      if (jobId && !mockMode) {
        try {
          const summary = await getSummary(jobId)
          setBatch(summary)
        } catch {
          // Non-fatal — output page can still render per-file data
        }
      }
      navigate('/output')
    }
    finish()
  }, [phase, jobId, mockMode, setBatch, navigate])

  const onEvent = useCallback(handleEvent, [handleEvent])

  // Only connect WS in real mode
  useWebSocket({
    jobId: mockMode ? null : jobId,
    onEvent,
    onStatusChange: setWsStatus,
  })

  const WsIcon = wsStatus === 'connected' ? Wifi : WifiOff

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Migration in Progress</h1>
          <p className="text-sm text-white/40 mt-1">
            {phase === 'uploading'   && 'Uploading files to server…'}
            {phase === 'processing'  && `AI agents processing ${counts.total} file${counts.total !== 1 ? 's' : ''}…`}
            {phase === 'complete'    && '✓ All files processed — redirecting to output…'}
            {phase === 'failed'      && 'Migration encountered a critical error.'}
          </p>
        </div>

        {/* WebSocket status */}
        {!mockMode && (
          <div className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium',
            wsStatus === 'connected'    && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
            wsStatus === 'connecting'   && 'border-amber-500/30 bg-amber-500/10 text-amber-300',
            wsStatus === 'disconnected' && 'border-white/10 bg-white/[0.04] text-white/30',
            wsStatus === 'error'        && 'border-red-500/30 bg-red-500/10 text-red-300',
          )}>
            {wsStatus === 'connecting'
              ? <RefreshCw className="h-3 w-3 animate-spin" />
              : <WsIcon className="h-3 w-3" />}
            <span className="capitalize">{wsStatus}</span>
          </div>
        )}
        {mockMode && (
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300">
            Demo mode
          </div>
        )}
      </div>

      {/* Phase-specific error message */}
      {phase === 'failed' && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <WifiOff className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-200">Migration Failed</p>
            <p className="text-xs text-red-300/60 mt-1">
              The migration job encountered an unrecoverable error. This may be due to a server restart,
              network issue, or API provider outage.
            </p>
            <p className="text-xs text-amber-300/70 mt-2">
              <strong className="text-amber-300">Next step:</strong> Start a new migration. Your uploaded files are safe — just re-submit them.
            </p>
          </div>
        </div>
      )}

      {/* Overall progress bar */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <GlobalProgressBar
          percentage={overall}
          total={counts.total}
          complete={counts.complete}
          failed={counts.failed}
          inProgress={counts.inProgress}
        />
      </div>

      {/* Per-file list */}
      <div>
        <h2 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">Files</h2>
        <FileProgressList files={files} />
      </div>

      {/* Action buttons */}
      {(phase === 'complete' || phase === 'failed') && (
        <div className="flex gap-3 pt-2">
          {phase === 'complete' && (
            <Button onClick={() => navigate('/output')}
              className="bg-violet-600 hover:bg-violet-500 text-white">
              View Output →
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/upload')}
            className="border-white/[0.1] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white">
            New Migration
          </Button>
        </div>
      )}
    </div>
  )
}

