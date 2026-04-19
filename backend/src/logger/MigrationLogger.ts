/**
 * MigrationLogger
 *
 * Writes a detailed, timestamped log file for every migration job to:
 *   logs/migrations/<batchId>/<fileName>.log
 *
 * Each entry is a structured JSON line so the log can be parsed programmatically
 * OR read as a human-readable chronological trace.
 *
 * Log levels:
 *   INFO  – normal pipeline progress
 *   DEBUG – AI prompts, raw LLM responses, token counts
 *   WARN  – recoverable conditions (low confidence, fallback used)
 *   ERROR – step failures, API errors, unexpected exceptions
 */

import fs from 'fs';
import path from 'path';

export type LogLevel = 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';

export interface LogEntry {
  ts: string;           // ISO timestamp
  level: LogLevel;
  batchId: string;
  fileName: string;
  step: number | null;  // null = job-level event, 1-7 = step-level
  stepName: string | null;
  event: string;        // short machine-readable event name
  message: string;      // human-readable description
  durationMs?: number;  // elapsed time for this step / call
  data?: Record<string, unknown>; // any extra payload (never contains API keys)
}

const LOGS_ROOT = path.resolve(process.cwd(), '..', 'logs', 'migrations');

export class MigrationLogger {
  private readonly batchId: string;
  private readonly fileName: string;
  private readonly logPath: string;
  private readonly jobStart: number;

  constructor(batchId: string, fileName: string) {
    this.batchId = batchId;
    this.fileName = fileName;
    this.jobStart = Date.now();

    // workspace/logs/migrations/<batchId>/
    const dir = path.join(LOGS_ROOT, batchId);
    fs.mkdirSync(dir, { recursive: true });

    // Safe filename: replace path separators and spaces
    const safeFile = fileName.replace(/[/\\:*?"<>|]/g, '_');
    this.logPath = path.join(dir, `${safeFile}.log`);

    this._write('INFO', null, null, 'JOB_START', `Migration job started`, {
      batchId,
      fileName,
      pid: process.pid,
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  info(step: number | null, stepName: string | null, event: string, message: string, data?: Record<string, unknown>) {
    this._write('INFO', step, stepName, event, message, data);
  }

  debug(step: number | null, stepName: string | null, event: string, message: string, data?: Record<string, unknown>) {
    this._write('DEBUG', step, stepName, event, message, data);
  }

  warn(step: number | null, stepName: string | null, event: string, message: string, data?: Record<string, unknown>) {
    this._write('WARN', step, stepName, event, message, data);
  }

  error(step: number | null, stepName: string | null, event: string, message: string, data?: Record<string, unknown>) {
    this._write('ERROR', step, stepName, event, message, data);
  }

  /** Log step start with declared inputs */
  stepStart(stepNumber: number, stepName: string, inputs?: Record<string, unknown>) {
    this._write('INFO', stepNumber, stepName, 'STEP_START', `▶ Step ${stepNumber}: ${stepName} — starting`, inputs);
  }

  /** Log step pass with outputs and duration */
  stepPass(stepNumber: number, stepName: string, durationMs: number, outputs?: Record<string, unknown>) {
    this._write('INFO', stepNumber, stepName, 'STEP_PASS', `✔ Step ${stepNumber}: ${stepName} — passed in ${durationMs}ms`, outputs, durationMs);
  }

  /** Log step failure */
  stepFail(stepNumber: number, stepName: string, reason: string, durationMs: number) {
    this._write('ERROR', stepNumber, stepName, 'STEP_FAIL', `✘ Step ${stepNumber}: ${stepName} — FAILED after ${durationMs}ms | ${reason}`, { reason }, durationMs);
  }

  /** Log step halt (unrecoverable, pipeline stops) */
  stepHalt(stepNumber: number, stepName: string, reason: string, durationMs: number) {
    this._write('ERROR', stepNumber, stepName, 'STEP_HALT', `⛔ Step ${stepNumber}: ${stepName} — HALTED after ${durationMs}ms | ${reason}`, { reason }, durationMs);
  }

  /** Log an LLM call attempt */
  llmCall(stepNumber: number, stepName: string, model: string, attempt: 'primary' | 'fallback', promptSummary: string) {
    this._write('DEBUG', stepNumber, stepName, 'LLM_CALL', `🤖 LLM call [${attempt}] using model: ${model}`, {
      model,
      attempt,
      promptSummary: promptSummary.slice(0, 300) + (promptSummary.length > 300 ? '...' : ''),
    });
  }

  /** Log LLM response */
  llmResponse(stepNumber: number, stepName: string, model: string, confidence: number, inputTokens: number, outputTokens: number, escalated: boolean) {
    const level: LogLevel = confidence < 0.85 ? 'WARN' : 'INFO';
    this._write(level, stepNumber, stepName, 'LLM_RESPONSE', `📥 LLM response from ${model} | confidence=${(confidence * 100).toFixed(1)}% | tokens in=${inputTokens} out=${outputTokens}${escalated ? ' | ⚠ escalating to fallback' : ''}`, {
      model,
      confidence,
      inputTokens,
      outputTokens,
      escalated,
      belowThreshold: confidence < 0.85,
    });
  }

  /** Log LLM API error */
  llmError(stepNumber: number, stepName: string, model: string, error: string) {
    this._write('ERROR', stepNumber, stepName, 'LLM_ERROR', `❌ LLM API error on model ${model}: ${error}`, { model, error });
  }

  /** Log job completion summary */
  jobComplete(overallStatus: string, totalDurationMs: number, summary: Record<string, unknown>) {
    this._write('INFO', null, null, 'JOB_COMPLETE', `🏁 Job finished — status=${overallStatus} | total=${totalDurationMs}ms`, {
      overallStatus,
      totalDurationMs,
      elapsedSinceStart: Date.now() - this.jobStart,
      ...summary,
    });
  }

  /** Returns the absolute path to this job's log file */
  get logFilePath(): string {
    return this.logPath;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private _write(
    level: LogLevel,
    step: number | null,
    stepName: string | null,
    event: string,
    message: string,
    data?: Record<string, unknown>,
    durationMs?: number
  ) {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      batchId: this.batchId,
      fileName: this.fileName,
      step,
      stepName,
      event,
      message,
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(data && Object.keys(data).length > 0 ? { data } : {}),
    };

    const line = JSON.stringify(entry) + '\n';

    // Append to file (sync to keep ordering deterministic even under concurrency)
    try {
      fs.appendFileSync(this.logPath, line, 'utf-8');
    } catch {
      // Never crash the migration pipeline because of a logging failure
    }

    // Also mirror to console with a compact prefix
    const prefix = `[migration][${this.batchId.slice(0, 8)}][${this.fileName}]`;
    if (level === 'ERROR') {
      console.error(`${prefix} ${message}`);
    } else if (level === 'WARN') {
      console.warn(`${prefix} ${message}`);
    } else if (level === 'DEBUG') {
      // Only print DEBUG to console when LOG_LEVEL=debug
      if (process.env.LOG_LEVEL === 'debug') {
        console.debug(`${prefix} ${message}`);
      }
    } else {
      console.log(`${prefix} ${message}`);
    }
  }
}
