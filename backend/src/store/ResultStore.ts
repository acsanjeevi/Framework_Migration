/**
 * ResultStore — Phase 7
 *
 * In-memory store that holds completed pipeline outputs keyed by jobId.
 * Results are also persisted to disk (workspace/results-store.json) so they
 * survive server restarts without requiring Redis.
 */

import fs from 'fs';
import path from 'path';
import { MigrationContext } from '../orchestrator/MigrationContext';
import { FolderNode } from '../workspace/WorkspaceManager';

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
  /** Folder tree of workspace/OUTPUT/<batchId> — populated after job completes */
  outputFolder?: FolderNode[];
}

// ── Singleton store ───────────────────────────────────────────────────────────
const PERSIST_FILE = path.resolve(process.cwd(), 'workspace', 'results-store.json');

function loadFromDisk(): Map<string, BatchResult> {
  try {
    const raw = fs.readFileSync(PERSIST_FILE, 'utf-8');
    const entries = JSON.parse(raw) as Array<[string, BatchResult]>;
    return new Map(entries);
  } catch {
    return new Map();
  }
}

function saveToDisk(map: Map<string, BatchResult>): void {
  try {
    fs.mkdirSync(path.dirname(PERSIST_FILE), { recursive: true });
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(Array.from(map.entries()), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[ResultStore] Could not persist to disk:', err);
  }
}

const store = loadFromDisk();

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
      saveToDisk(store);
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
