import { create } from 'zustand'
import type {
  FileProgress,
  UploadConfig,
  UploadResponse,
  BatchResult,
  ProgressEvent,
} from '@/types/api'

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

export type MigrationPhase =
  | 'idle'          // No job started
  | 'uploading'     // Upload in progress
  | 'processing'    // WebSocket connected, files being migrated
  | 'complete'      // All files done
  | 'failed'        // Fatal upload/job error

interface MigrationState {
  // ── Job metadata ────────────────────────────────────────────────────────────
  phase: MigrationPhase
  jobId: string | null
  config: UploadConfig | null
  uploadedFileNames: string[]

  // ── Per-file progress ────────────────────────────────────────────────────────
  files: FileProgress[]

  // ── Final batch result (populated from summary endpoint) ────────────────────
  batchResult: BatchResult | null

  // ── Mock mode (bypasses real API calls when Redis is offline) ───────────────
  mockMode: boolean

  // ── Error state ──────────────────────────────────────────────────────────────
  uploadError: string | null

  // ── Actions ──────────────────────────────────────────────────────────────────
  setMockMode: (enabled: boolean) => void
  startUpload: (fileNames: string[], config: UploadConfig) => void
  setUploadSuccess: (response: UploadResponse) => void
  setUploadError: (error: string) => void
  handleProgressEvent: (event: ProgressEvent) => void
  setBatchResult: (result: BatchResult) => void
  reset: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeInitialFileProgress(fileName: string): FileProgress {
  return {
    fileName,
    status: 'queued',
    percentage: 0,
    currentStep: 0,
    currentStepName: 'Queued',
    confidenceScore: null,
    lineCoverage: null,
    branchCoverage: null,
    errorReason: null,
    agentUsed: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL: Omit<MigrationState,
  'setMockMode' | 'startUpload' | 'setUploadSuccess' | 'setUploadError' |
  'handleProgressEvent' | 'setBatchResult' | 'reset'
> = {
  phase: 'idle',
  jobId: null,
  config: null,
  uploadedFileNames: [],
  files: [],
  batchResult: null,
  mockMode: false,
  uploadError: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useMigrationStore = create<MigrationState>()((set) => ({
  ...INITIAL,

  setMockMode(enabled) {
    set({ mockMode: enabled })
  },

  startUpload(fileNames, config) {
    set({
      phase: 'uploading',
      uploadedFileNames: fileNames,
      config,
      files: fileNames.map(makeInitialFileProgress),
      batchResult: null,
      uploadError: null,
      jobId: null,
    })
  },

  setUploadSuccess(response) {
    set({
      phase: 'processing',
      jobId: response.jobId,
      // Ensure files list matches upload response (server may normalise names)
      files: response.files.map((f) => makeInitialFileProgress(f.name)),
    })
  },

  setUploadError(error) {
    set({ phase: 'failed', uploadError: error })
  },

  handleProgressEvent(event) {
    if (event.type === 'CONNECTED') return // nothing to update in store

    set((state) => {
      const updatedFiles = state.files.map((f) => {
        if (f.fileName !== event.fileName) return f

        if (event.type === 'PROGRESS') {
          return {
            ...f,
            status: 'in-progress' as const,
            percentage: event.percentage,
            currentStep: event.step,
            currentStepName: event.stepName,
            agentUsed: event.agentUsed ?? f.agentUsed,
            confidenceScore: event.confidence ?? f.confidenceScore,
            lineCoverage: event.coverage?.linePct ?? f.lineCoverage,
            branchCoverage: event.coverage?.branchPct ?? f.branchCoverage,
          }
        }

        if (event.type === 'COMPLETE') {
          return {
            ...f,
            status: 'complete' as const,
            percentage: 100,
            currentStep: 7,
            currentStepName: 'Final Verification',
            agentUsed: event.agentUsed ?? f.agentUsed,
            confidenceScore: event.confidence ?? f.confidenceScore,
            lineCoverage: event.coverage?.linePct ?? f.lineCoverage,
            branchCoverage: event.coverage?.branchPct ?? f.branchCoverage,
            errorReason: null,
          }
        }

        if (event.type === 'FAILED') {
          return {
            ...f,
            status: 'failed' as const,
            errorReason: event.errorReason ?? 'Unknown error',
          }
        }

        return f
      })

      // Derive overall phase from all file statuses
      const allDone = updatedFiles.every((f) => f.status === 'complete' || f.status === 'failed')
      const phase: MigrationPhase = allDone ? 'complete' : 'processing'

      return { files: updatedFiles, phase }
    })
  },

  setBatchResult(result) {
    set({ batchResult: result })
  },

  reset() {
    set({ ...INITIAL })
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Derived selectors (use outside of store for component performance)
// ─────────────────────────────────────────────────────────────────────────────

/** Overall batch % = average of all file percentages */
export function selectOverallProgress(files: FileProgress[]): number {
  if (files.length === 0) return 0
  return Math.round(files.reduce((sum, f) => sum + f.percentage, 0) / files.length)
}

/** Count of files by status */
export function selectStatusCounts(files: FileProgress[]) {
  return {
    total: files.length,
    complete: files.filter((f) => f.status === 'complete').length,
    failed: files.filter((f) => f.status === 'failed').length,
    inProgress: files.filter((f) => f.status === 'in-progress').length,
    queued: files.filter((f) => f.status === 'queued').length,
  }
}
