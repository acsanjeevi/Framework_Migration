/**
 * ResultStore — Phase 7
 *
 * In-memory store that holds completed pipeline outputs keyed by jobId.
 * The MigrationQueue processor writes into this store after each file
 * completes successfully; the REST result/summary endpoints read from it.
 *
 * This is intentionally a simple Map — Redis-backed persistence is out of
 * scope for the hackathon and can be layered on later.
 */

import { MigrationContext } from '../orchestrator/MigrationContext';

export interface CompletedFileResult {
  fileName: string;
  status: 'complete' | 'failed';
  healedCode?: string;
  cicdYaml?: string;
  cicdFileName?: string;
  coverage?: { linePct: number; branchPct: number };
  confidence?: number;
  agentUsed?: string;
  detectedFramework?: string;
  detectedPattern?: string;
  errorReason?: string;
}

export interface BatchResult {
  batchId: string;
  completedAt: string;
  config: {
    sourceFramework: string;
    targetLanguage: string;
    cicdPlatform: string;
  };
  files: CompletedFileResult[];
}

// ── Singleton store ───────────────────────────────────────────────────────────
const store = new Map<string, BatchResult>();

export const ResultStore = {
  /** Initialise or retrieve the batch record for a job. */
  initBatch(
    batchId: string,
    config: BatchResult['config']
  ): void {
    if (!store.has(batchId)) {
      store.set(batchId, {
        batchId,
        completedAt: new Date().toISOString(),
        config,
        files: [],
      });
    }
  },

  /** Append a completed file result to the batch. */
  addFileResult(batchId: string, result: CompletedFileResult): void {
    const batch = store.get(batchId);
    if (batch) {
      batch.files.push(result);
      batch.completedAt = new Date().toISOString();
    }
  },

  /** Retrieve the full batch result (or undefined if not found). */
  get(batchId: string): BatchResult | undefined {
    return store.get(batchId);
  },

  /** Build a CompletedFileResult from a final MigrationContext. */
  fromContext(
    ctx: MigrationContext,
    status: 'complete' | 'failed',
    cicdFileName?: string,
    errorReason?: string
  ): CompletedFileResult {
    return {
      fileName: ctx.fileName,
      status,
      healedCode: ctx.healedCode,
      cicdYaml: ctx.cicdYaml,
      cicdFileName,
      coverage: ctx.coverage,
      confidence: ctx.confidence,
      agentUsed: ctx.agentUsed,
      detectedFramework: ctx.detectedFramework,
      detectedPattern: ctx.detectedPattern,
      errorReason,
    };
  },
};
