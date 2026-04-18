import {
  MOCK_EVENT_SEQUENCES,
  MOCK_FILE_DELAYS_MS,
  MOCK_STEP_INTERVAL_MS,
  MOCK_BATCH_RESULT,
} from './mockData'
import type { ProgressEvent } from '@/types/api'

type EventCallback = (event: ProgressEvent) => void
type CompleteCallback = () => void

/**
 * Simulates the full 7-step WebSocket stream for all demo files.
 * Files are staggered in time so the progress dashboard shows
 * multiple files advancing simultaneously.
 *
 * Returns a cancel function — call it if the user navigates away.
 */
export function runMockMigration(
  onEvent: EventCallback,
  onBatchComplete: CompleteCallback
): () => void {
  const timeouts: ReturnType<typeof setTimeout>[] = []

  // Fire CONNECTED immediately
  onEvent({
    type: 'CONNECTED',
    fileName: '',
    percentage: 0,
    step: 0,
    stepName: '',
    agentUsed: 'stub',
  })

  let completedFiles = 0

  MOCK_EVENT_SEQUENCES.forEach((sequence, fileIndex) => {
    const fileDelay = MOCK_FILE_DELAYS_MS[fileIndex] ?? fileIndex * 800

    sequence.forEach((event, stepIndex) => {
      const t = setTimeout(() => {
        onEvent(event)

        // When the last event for this file fires, check if all files are done
        if (stepIndex === sequence.length - 1) {
          completedFiles++
          if (completedFiles === MOCK_EVENT_SEQUENCES.length) {
            // Small delay before signalling batch complete (so UI settles)
            const finalT = setTimeout(() => {
              onBatchComplete()
            }, 600)
            timeouts.push(finalT)
          }
        }
      }, fileDelay + stepIndex * MOCK_STEP_INTERVAL_MS)

      timeouts.push(t)
    })
  })

  return () => timeouts.forEach(clearTimeout)
}

export { MOCK_BATCH_RESULT }
