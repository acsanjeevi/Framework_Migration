import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useMigrationStore } from '@/store/migrationStore'
import { useLLMStore } from '@/store/llmStore'
import { uploadFiles } from '@/api/migrate'
import { getSummary } from '@/api/migrate'
import { runMockMigration, MOCK_BATCH_RESULT } from '@/mock/mockRunner'
import { MOCK_UPLOAD_RESPONSE } from '@/mock/mockData'
import type { UploadConfig, ProgressEvent } from '@/types/api'

/**
 * Top-level orchestration hook.
 * Handles the full migration flow for both real-API and mock modes.
 *
 * Usage:
 *   const { migrate, isUploading } = useMigration()
 *   migrate(files, config)
 */
export function useMigration() {
  const navigate = useNavigate()
  const mockCancelRef = useRef<(() => void) | null>(null)

  const { mockMode, phase, startUpload, setUploadSuccess, setUploadError, handleProgressEvent, setBatchResult } =
    useMigrationStore()
  const { provider, apiKey, primaryModel, fallbackModel } = useLLMStore()

  const isUploading = phase === 'uploading'

  // ── Shared event handler wired to both real WS and mock runner ─────────────
  const handleEvent = useCallback(
    (event: ProgressEvent) => {
      handleProgressEvent(event)
    },
    [handleProgressEvent]
  )

  // ── Fetch summary once all files are done ──────────────────────────────────
  const fetchSummary = useCallback(
    async (jobId: string) => {
      // In mock mode we already have the result
      if (mockMode) {
        setBatchResult(MOCK_BATCH_RESULT)
        return
      }
      try {
        const result = await getSummary(jobId)
        setBatchResult(result)
      } catch (err) {
        console.warn('[useMigration] Could not fetch summary:', err)
        // Non-fatal — Output Viewer still works from Zustand file state
      }
    },
    [mockMode, setBatchResult]
  )

  // ── Main migrate function called by UploadPage ─────────────────────────────
  const migrate = useCallback(
    async (files: File[], config: UploadConfig) => {
      // Cancel any previous mock run
      mockCancelRef.current?.()
      mockCancelRef.current = null

      startUpload(files.map((f) => f.name), config)
      navigate('/progress')

      // ── MOCK MODE ──────────────────────────────────────────────────────────
      if (mockMode) {
        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 600))
        setUploadSuccess(MOCK_UPLOAD_RESPONSE)
        toast.success('Demo mode: mock migration started')

        mockCancelRef.current = runMockMigration(
          handleEvent,
          () => {
            fetchSummary(MOCK_UPLOAD_RESPONSE.jobId)
            toast.success('Mock migration complete!')
          }
        )
        return
      }

      // ── REAL MODE ──────────────────────────────────────────────────────────
      try {
        const llmOverride =
          apiKey
            ? { provider, apiKey, primaryModel, fallbackModel }
            : undefined

        const uploadResponse = await uploadFiles(files, config, llmOverride)
        setUploadSuccess(uploadResponse)
        toast.success(`${uploadResponse.fileCount} file(s) queued for migration`)

        // WebSocket is opened by useWebSocket in ProgressPage once jobId is set
        // Summary is fetched by ProgressPage when phase becomes 'complete'
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setUploadError(message)
        toast.error(`Upload failed: ${message}`)
        navigate('/upload')
      }
    },
    [
      mockMode,
      navigate,
      startUpload,
      setUploadSuccess,
      setUploadError,
      handleEvent,
      fetchSummary,
      provider,
      apiKey,
      primaryModel,
      fallbackModel,
    ]
  )

  return {
    migrate,
    isUploading,
    fetchSummary,
    handleEvent,
  }
}
