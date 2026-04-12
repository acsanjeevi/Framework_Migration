// ─────────────────────────────────────────────────────────────────────────────
// Enums — match backend validation.middleware.ts Zod schemas exactly
// ─────────────────────────────────────────────────────────────────────────────

export type SourceFramework =
  | 'cypress'
  | 'selenium'
  | 'robot'
  | 'webdriverio'
  | 'testcafe'
  | 'nightwatch'

export type TargetLanguage = 'typescript' | 'javascript' | 'java' | 'python'

export type CICDPlatform = 'azure' | 'gitlab' | 'jenkins'

// ─────────────────────────────────────────────────────────────────────────────
// Upload API  (/api/migrate/upload)
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadConfig {
  sourceFramework: SourceFramework
  targetLanguage: TargetLanguage
  cicdPlatform: CICDPlatform
}

/** POST /api/migrate/upload  — 202 Accepted */
export interface UploadResponse {
  status: 'accepted'
  jobId: string
  fileCount: number
  files: Array<{ name: string; size: number }>
  config: UploadConfig
  /** WebSocket path, e.g. "/ws/progress/batch_..." */
  websocket: string
  message: string
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket events  (ws://localhost:3001/ws/progress/:jobId)
// ─────────────────────────────────────────────────────────────────────────────

/** Coverage fields use linePct/branchPct (NOT line/branch — see backend ProgressEvent.ts) */
export interface CoveragePayload {
  linePct: number
  branchPct: number
}

export interface ProgressEvent {
  type: 'PROGRESS' | 'COMPLETE' | 'FAILED' | 'CONNECTED'
  fileName: string
  percentage: number
  step: number
  stepName: string
  /** Model ID, e.g. 'claude-haiku-4-5', 'gpt-4o-mini', 'stub' */
  agentUsed: string
  confidence?: number
  coverage?: CoveragePayload
  errorReason?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary API  (/api/migrate/summary/:jobId)
// ─────────────────────────────────────────────────────────────────────────────

export interface CompletedFileResult {
  fileName: string
  status: 'complete' | 'failed'
  healedCode?: string
  cicdYaml?: string
  cicdFileName?: string
  coverage?: CoveragePayload
  confidence?: number
  agentUsed?: string
  detectedFramework?: string
  detectedPattern?: string
  errorReason?: string
}

export interface BatchResult {
  batchId: string
  completedAt: string
  config: UploadConfig
  files: CompletedFileResult[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Status API  (/api/migrate/status/:jobId)
// ─────────────────────────────────────────────────────────────────────────────

export interface JobStatusResponse {
  jobStatus: string
  progress: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Frontend-only: per-file progress state (drives the Progress Dashboard)
// ─────────────────────────────────────────────────────────────────────────────

export type FileStatus = 'queued' | 'in-progress' | 'complete' | 'failed'

export interface FileProgress {
  fileName: string
  status: FileStatus
  percentage: number
  currentStep: number
  currentStepName: string
  confidenceScore: number | null
  lineCoverage: number | null
  branchCoverage: number | null
  errorReason: string | null
  /** Model ID from agent (e.g. 'claude-haiku-4-5', 'stub') */
  agentUsed: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Step name map (duplicated from backend STEP_PROGRESS for UI label display)
// ─────────────────────────────────────────────────────────────────────────────

export const STEP_NAMES: Record<number, string> = {
  1: 'Framework Detection',
  2: 'Pattern Identification',
  3: 'Code Transformation',
  4: 'Self-Healing',
  5: 'CI/CD Generation',
  6: 'Coverage Analysis',
  7: 'Final Verification',
}

export const STEP_PROGRESS: Record<number, number> = {
  1: 10,
  2: 25,
  3: 50,
  4: 65,
  5: 80,
  6: 90,
  7: 100,
}
