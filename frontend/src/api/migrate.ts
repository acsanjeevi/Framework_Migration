import { apiClient } from './client'
import type { UploadResponse, BatchResult, JobStatusResponse, UploadConfig } from '@/types/api'

// ─────────────────────────────────────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────────────────────────────────────

export interface LLMOverride {
  provider: 'anthropic' | 'openai' | 'groq'
  apiKey: string
  primaryModel: string
  fallbackModel: string
}

/**
 * POST /api/migrate/upload
 * Sends files + config + optional LLM override as multipart/form-data.
 */
export async function uploadFiles(
  files: File[],
  config: UploadConfig,
  llm?: LLMOverride
): Promise<UploadResponse> {
  const form = new FormData()

  files.forEach((file) => form.append('files', file))
  form.append('sourceFramework', config.sourceFramework)
  form.append('targetLanguage', config.targetLanguage)
  form.append('cicdPlatform', config.cicdPlatform)

  if (llm?.apiKey) {
    form.append('llmProvider', llm.provider)
    form.append('llmApiKey', llm.apiKey)
    form.append('llmPrimaryModel', llm.primaryModel)
    form.append('llmFallbackModel', llm.fallbackModel)
  }

  const response = await apiClient.post<UploadResponse>('/api/migrate/upload', form)
  return response.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/migrate/summary/:jobId — returns the full BatchResult. */
export async function getSummary(jobId: string): Promise<BatchResult> {
  const response = await apiClient.get<BatchResult>(`/api/migrate/summary/${jobId}`)
  return response.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/migrate/status/:jobId — Bull queue status (requires Redis). */
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await apiClient.get<JobStatusResponse>(`/api/migrate/status/${jobId}`)
  return response.data
}

// ─────────────────────────────────────────────────────────────────────────────
// ZIP download
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/migrate/result/:jobId
 * Triggers a browser file download of the ZIP archive.
 */
export async function downloadZip(jobId: string): Promise<void> {
  const response = await apiClient.get(`/api/migrate/result/${jobId}`, {
    responseType: 'blob',
  })

  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `migration-${jobId}.zip`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; uptime: number }> {
  const response = await apiClient.get('/health')
  return response.data
}
