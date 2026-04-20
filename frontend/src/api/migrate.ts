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

// ─────────────────────────────────────────────────────────────────────────────
// File optimisation (whitespace-only — never touches code semantics)
// ─────────────────────────────────────────────────────────────────────────────
const TEXT_EXTENSIONS = new Set(['.ts', '.js', '.java', '.py', '.feature', '.xml'])

function isTextFile(name: string): boolean {
  const lower = name.toLowerCase()
  return Array.from(TEXT_EXTENSIONS).some(ext => lower.endsWith(ext))
}

/**
 * Applies safe, whitespace-only clean-ups to a source file:
 *   1. Strip UTF-8 BOM
 *   2. Normalize CRLF → LF
 *   3. Remove trailing spaces/tabs from every line
 *   4. Collapse 3+ consecutive blank lines down to 2
 *   5. Ensure a single trailing newline
 *
 * Binary files (.zip) and unreadable files are returned unchanged.
 */
async function optimizeFile(file: File): Promise<File> {
  if (!isTextFile(file.name)) return file
  try {
    const raw = await file.text()
    const optimized = raw
      .replace(/^\uFEFF/, '')        // strip BOM
      .replace(/\r\n/g, '\n')        // CRLF → LF
      .replace(/\r/g, '\n')          // lone CR → LF
      .replace(/[ \t]+$/gm, '')      // trailing whitespace per line
      .replace(/\n{3,}/g, '\n\n')    // collapse 3+ blank lines → 2
      .trim() + '\n'                 // single trailing newline
    return new File([optimized], file.name, {
      type: file.type || 'text/plain',
      lastModified: file.lastModified,
    })
  } catch {
    return file  // if text read fails, send original unchanged
  }
}

/**
 * POST /api/migrate/upload
 * Sends files + config + optional LLM override as multipart/form-data.
 * Text source files are whitespace-optimised before upload.
 */
export async function uploadFiles(
  files: File[],
  config: UploadConfig,
  llm?: LLMOverride
): Promise<UploadResponse> {
  const form = new FormData()

  const optimized = await Promise.all(files.map(optimizeFile))
  optimized.forEach((file) => form.append('files', file))
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
