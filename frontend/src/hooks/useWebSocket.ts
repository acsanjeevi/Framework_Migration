import { useEffect, useRef, useCallback } from 'react'
import type { ProgressEvent } from '@/types/api'

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3001'

type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface UseWebSocketOptions {
  jobId: string | null
  onEvent: (event: ProgressEvent) => void
  onStatusChange?: (status: WSStatus) => void
}

/**
 * Connects to ws://localhost:3001/ws/progress/:jobId and feeds parsed
 * ProgressEvent messages into the provided callback.
 *
 * - Automatically closes when jobId becomes null or the component unmounts.
 * - Does NOT auto-reconnect (backend closes the connection on job finish).
 */
export function useWebSocket({ jobId, onEvent, onStatusChange }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  const onStatusRef = useRef(onStatusChange)

  // Keep callbacks stable without re-triggering the effect
  useEffect(() => { onEventRef.current = onEvent }, [onEvent])
  useEffect(() => { onStatusRef.current = onStatusChange }, [onStatusChange])

  const close = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!jobId) return
    close() // close any existing connection first

    const url = `${WS_BASE}/ws/progress/${encodeURIComponent(jobId)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    onStatusRef.current?.('connecting')

    ws.onopen = () => {
      onStatusRef.current?.('connected')
    }

    ws.onmessage = (msgEvent) => {
      let parsed: ProgressEvent
      try {
        parsed = JSON.parse(msgEvent.data as string) as ProgressEvent
      } catch {
        console.warn('[ws] Failed to parse message:', msgEvent.data)
        return
      }
      onEventRef.current(parsed)
    }

    ws.onerror = () => {
      onStatusRef.current?.('error')
    }

    ws.onclose = () => {
      onStatusRef.current?.('disconnected')
      wsRef.current = null
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [jobId, close])

  return { close }
}
