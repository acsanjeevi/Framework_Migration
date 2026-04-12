export type StepStatus = 'pass' | 'fail' | 'halt';

export interface StepResult {
  stepNumber: number;
  stepName: string;
  status: StepStatus;
  /** Confidence score 0–1, populated from Steps 3 and 7 */
  confidence: number | null;
  /** Step-specific output payload (typed per step consumer) */
  data: Record<string, unknown> | null;
  /** Human-readable failure reason; null on success */
  errorReason: string | null;
  durationMs: number;
}

export function makePassResult(
  stepNumber: number,
  stepName: string,
  data: Record<string, unknown>,
  durationMs: number,
  confidence: number | null = null
): StepResult {
  return { stepNumber, stepName, status: 'pass', confidence, data, errorReason: null, durationMs };
}

export function makeFailResult(
  stepNumber: number,
  stepName: string,
  errorReason: string,
  durationMs: number
): StepResult {
  return { stepNumber, stepName, status: 'fail', confidence: null, data: null, errorReason, durationMs };
}

export function makeHaltResult(
  stepNumber: number,
  stepName: string,
  errorReason: string,
  durationMs: number
): StepResult {
  return { stepNumber, stepName, status: 'halt', confidence: null, data: null, errorReason, durationMs };
}
