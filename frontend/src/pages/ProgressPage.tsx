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
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Migration Progress</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {phase === 'uploading'   && 'Uploading files…'}
            {phase === 'processing'  && `Processing ${counts.total} file${counts.total !== 1 ? 's' : ''}…`}
            {phase === 'complete'    && 'All files processed — redirecting to output…'}
            {phase === 'failed'      && 'Migration failed.'}
          </p>
        </div>

        {/* WebSocket status indicator (real mode only) */}
        {!mockMode && (
          <div className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border',
            wsStatus === 'connected'    && 'border-green-300 bg-green-50 text-green-700',
            wsStatus === 'connecting'   && 'border-amber-300 bg-amber-50 text-amber-700',
            wsStatus === 'disconnected' && 'border-border bg-muted text-muted-foreground',
            wsStatus === 'error'        && 'border-red-300 bg-red-50 text-red-600',
          )}>
            {wsStatus === 'connecting'
              ? <RefreshCw className="h-3 w-3 animate-spin" />
              : <WsIcon className="h-3 w-3" />}
            <span className="capitalize">{wsStatus}</span>
          </div>
        )}
        {mockMode && (
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-700">
            Demo mode
          </div>
        )}
      </div>

      {/* Overall progress */}
      <GlobalProgressBar
        percentage={overall}
        total={counts.total}
        complete={counts.complete}
        failed={counts.failed}
        inProgress={counts.inProgress}
      />

      {/* Per-file list */}
      <div>
        <h2 className="text-sm font-medium mb-3">Files</h2>
        <FileProgressList files={files} />
      </div>

      {/* Action buttons */}
      {(phase === 'complete' || phase === 'failed') && (
        <div className="flex gap-3 pt-2">
          {phase === 'complete' && (
            <Button onClick={() => navigate('/output')}>
              View Output →
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/upload')}>
            New Migration
          </Button>
        </div>
      )}
    </div>
  )
}

