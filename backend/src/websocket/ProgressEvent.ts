/** WebSocket event pushed from backend to connected browser clients. */
export interface ProgressEvent {
  type: 'PROGRESS' | 'COMPLETE' | 'FAILED' | 'CONNECTED';
  fileName: string;
  percentage: number;
  step: number;
  stepName: string;
  /** Model ID used (e.g. 'claude-haiku-4-5', 'gpt-4o-mini', 'stub') */
  agentUsed: string;
  confidence?: number;
  coverage?: { linePct: number; branchPct: number };
  errorReason?: string;
}
