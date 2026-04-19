import Bull from 'bull';
import fs from 'fs';
import { MigrationContext } from '../orchestrator/MigrationContext';
import { MigrationOrchestrator } from '../orchestrator/MigrationOrchestrator';
import { progressEmitter } from '../websocket/ProgressEmitter';
import { ResultStore } from '../store/ResultStore';
import { writeOutputFiles } from '../workspace/WorkspaceManager';

// ── Job data shape stored in Redis ───────────────────────────────────────────
export interface MigrationFileEntry {
  fileName: string;
  /** Absolute path where multer stored the file */
  filePath: string;
}

export interface MigrationJobData {
  batchId: string;
  files: MigrationFileEntry[];
  config: {
    sourceFramework: string;
    targetLanguage: 'typescript' | 'javascript' | 'java' | 'python';
    cicdPlatform: 'azure' | 'gitlab' | 'jenkins';
  };
  /** Optional per-request LLM override sent from the frontend Settings dialog. */
  llmConfig?: {
    provider: 'anthropic' | 'openai' | 'groq';
    apiKey: string;
    primaryModel: string;
    fallbackModel: string;
  };
}

// ── Bull queue ───────────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const migrationQueue = new Bull<MigrationJobData>('migration', REDIS_URL, {
  defaultJobOptions: {
    attempts: 1,       // No automatic retries — failed jobs require human review
    removeOnComplete: 50,
    removeOnFail: 50,
  },
});

// ── Redis availability tracking ───────────────────────────────────────────────
let _redisAvailable = true;
let _redisErrorLogged = false;
migrationQueue.on('error', (err) => {
  _redisAvailable = false;
  if (!_redisErrorLogged) {
    console.warn('[queue] Redis unavailable — falling back to in-memory processing. Details:', err.message || '(no details)');
    console.warn('[queue] Start Redis (e.g. redis-server) to enable durable job queuing.');
    _redisErrorLogged = true;
  }
});

migrationQueue.on('ready', () => {
  if (!_redisAvailable) {
    console.info('[queue] Redis reconnected — resuming Bull queue processing.');
  }
  _redisAvailable = true;
  _redisErrorLogged = false;
});

migrationQueue.on('failed', (job, err) => {
  console.error(`[queue] Job ${job.id} failed:`, err.message);
});

/** Returns true when Redis is reachable and Bull is processing normally. */
export function isQueueReady(): boolean {
  return _redisAvailable;
}

// ── Core processor logic (shared by Bull and in-memory fallback) ──────────────
async function processJobData(data: MigrationJobData): Promise<Array<{ fileName: string; status: string }>> {
  const { batchId, files, config, llmConfig } = data;
  const orchestrator = new MigrationOrchestrator();
  const results = [];

  // Initialise result store for this batch
  ResultStore.initBatch(batchId, config);

  // Delay between files to avoid TPM/RPM rate limits on free-tier LLM APIs.
  // Configurable via FILE_PROCESS_DELAY_MS env var (default 3000ms).
  const FILE_DELAY_MS = parseInt(process.env.FILE_PROCESS_DELAY_MS ?? '3000', 10);

  for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
    const fileEntry = files[fileIdx];

    // Stagger requests — skip delay for the first file
    if (fileIdx > 0 && FILE_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, FILE_DELAY_MS));
    }

    let sourceCode: string;
    try {
      sourceCode = fs.readFileSync(fileEntry.filePath, 'utf-8');
    } catch {
      console.error(`[queue] Cannot read file ${fileEntry.filePath}`);
      const failedResult = ResultStore.fromContext(
        {
          jobId: batchId,
          fileName: fileEntry.fileName,
          sourceCode: '',
          declaredSourceFramework: config.sourceFramework,
          targetLanguage: config.targetLanguage,
          cicdPlatform: config.cicdPlatform,
        },
        'failed',
        undefined,
        `Could not read uploaded file: ${fileEntry.fileName}`
      );
      ResultStore.addFileResult(batchId, failedResult);

      progressEmitter.emit(batchId, {
        type: 'FAILED',
        fileName: fileEntry.fileName,
        percentage: 0,
        step: 0,
        stepName: 'File Read',
        agentUsed: 'stub',
        errorReason: `Could not read uploaded file: ${fileEntry.fileName}`,
      });
      continue;
    }

    const ctx: MigrationContext = {
      jobId: batchId,
      fileName: fileEntry.fileName,
      sourceCode,
      declaredSourceFramework: config.sourceFramework,
      targetLanguage: config.targetLanguage,
      cicdPlatform: config.cicdPlatform,
      ...(llmConfig ? { llmConfig } : {}),
    };

    const result = await orchestrator.run(ctx, (update) => {
      progressEmitter.emit(batchId, {
        type: 'PROGRESS',
        fileName: update.fileName,
        percentage: update.percentage,
        step: update.stepNumber,
        stepName: update.stepName,
        agentUsed: ctx.agentUsed ?? 'stub',
      });
    });

    // Determine CI/CD output filename from platform
    const cicdFileNames: Record<string, string> = {
      azure: 'azure-pipelines.yml',
      gitlab: '.gitlab-ci.yml',
      jenkins: 'Jenkinsfile',
    };
    const cicdFileName = cicdFileNames[config.cicdPlatform];

    if (result.overallStatus === 'complete') {
      ResultStore.addFileResult(batchId, ResultStore.fromContext(ctx, 'complete', cicdFileName));

      // Write migrated files to workspace/OUTPUT/<batchId>
      const outputFiles: Array<{ name: string; content: string }> = [];
      if (result.output.healedCode) {
        outputFiles.push({ name: `migrated/${fileEntry.fileName}`, content: result.output.healedCode });
      }
      if (result.output.cicdYaml && cicdFileName) {
        outputFiles.push({ name: `cicd/${cicdFileName}`, content: result.output.cicdYaml });
      }
      if (outputFiles.length > 0) {
        try { writeOutputFiles(batchId, outputFiles); } catch (e) {
          console.warn('[queue] Could not write output files to workspace:', e);
        }
      }

      progressEmitter.emit(batchId, {
        type: 'COMPLETE',
        fileName: fileEntry.fileName,
        percentage: 100,
        step: 7,
        stepName: 'Final Verification',
        agentUsed: result.output.agentUsed ?? 'stub',
        confidence: result.output.confidence ?? undefined,
        coverage: result.output.coverage ?? undefined,
      });
    } else {
      const lastStep = result.steps[result.steps.length - 1];
      const errorReason = lastStep?.errorReason ?? 'Unknown pipeline error';

      ResultStore.addFileResult(batchId, ResultStore.fromContext(ctx, 'failed', cicdFileName, errorReason));

      progressEmitter.emit(batchId, {
        type: 'FAILED',
        fileName: fileEntry.fileName,
        percentage: 0,
        step: lastStep?.stepNumber ?? 0,
        stepName: lastStep?.stepName ?? 'unknown',
        agentUsed: ctx.agentUsed ?? 'stub',
        errorReason,
      });
    }

    results.push({ fileName: fileEntry.fileName, status: result.overallStatus });
  }

  return results;
}

// ── Bull processor — delegates to shared processJobData ──────────────────────
migrationQueue.process(async (job: Bull.Job<MigrationJobData>) => {
  return processJobData(job.data);
});

// ── Public helpers ───────────────────────────────────────────────────────────

/**
 * Enqueue a batch migration job.
 * When Redis is available, the job is placed on the Bull queue for durable processing.
 * When Redis is unavailable, the job runs immediately in-process as a fallback
 * so the app stays functional without a Redis instance.
 */
export async function enqueueJob(data: MigrationJobData): Promise<Bull.Job<MigrationJobData>> {
  if (_redisAvailable) {
    const timeoutMs = 3000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timed out after 3s')), timeoutMs)
    );
    try {
      return await Promise.race([migrationQueue.add(data, { jobId: data.batchId }), timeoutPromise]);
    } catch (err) {
      _redisAvailable = false;
      console.warn('[queue] Redis failed during enqueue — switching to in-memory fallback:', (err as Error).message);
    }
  }

  // ── In-memory fallback path ──────────────────────────────────────────────
  console.info(`[queue:fallback] Running job ${data.batchId} in-process (no Redis).`);
  // Run async, non-blocking — progress events still flow via progressEmitter
  setImmediate(() => {
    processJobData(data).catch((err) => {
      console.error(`[queue:fallback] Job ${data.batchId} error:`, err);
    });
  });

  // Return a minimal stub that satisfies the Bull.Job interface for callers
  return { id: data.batchId, data, opts: {}, queue: migrationQueue } as unknown as Bull.Job<MigrationJobData>;
}

/** Returns queue depth and Redis connectivity for /health/queue. */
export async function getQueueHealth(): Promise<{
  redisConnected: boolean;
  latencyMs: number | null;
  counts: { waiting: number; active: number; completed: number; failed: number } | null;
  activeConnections: number;
}> {
  const start = Date.now();

  const timeoutMs = 2000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Redis health check timed out')), timeoutMs)
  );

  try {
    const counts = await Promise.race([migrationQueue.getJobCounts(), timeoutPromise]);
    return {
      redisConnected: true,
      latencyMs: Date.now() - start,
      counts: {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
      },
      activeConnections: progressEmitter.activeConnectionCount(),
    };
  } catch {
    return {
      redisConnected: false,
      latencyMs: null,
      counts: null,
      activeConnections: progressEmitter.activeConnectionCount(),
    };
  }
}
