import Bull from 'bull';
import fs from 'fs';
import { MigrationContext } from '../orchestrator/MigrationContext';
import { MigrationOrchestrator } from '../orchestrator/MigrationOrchestrator';
import { progressEmitter } from '../websocket/ProgressEmitter';
import { ResultStore } from '../store/ResultStore';

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

// ── Queue event listeners (logged; not fatal) ─────────────────────────────────
migrationQueue.on('error', (err) => {
  console.error('[queue] Bull error:', err.message);
});

migrationQueue.on('failed', (job, err) => {
  console.error(`[queue] Job ${job.id} failed:`, err.message);
});

// ── Processor ────────────────────────────────────────────────────────────────
migrationQueue.process(async (job: Bull.Job<MigrationJobData>) => {
  const { batchId, files, config, llmConfig } = job.data;
  const orchestrator = new MigrationOrchestrator();
  const results = [];

  // Initialise result store for this batch
  ResultStore.initBatch(batchId, config);

  for (const fileEntry of files) {
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
});

// ── Public helpers ───────────────────────────────────────────────────────────

/** Enqueue a batch. Throws if Redis is unavailable or times out after 3s. */
export async function enqueueJob(data: MigrationJobData): Promise<Bull.Job<MigrationJobData>> {
  const timeoutMs = 3000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Redis connection timed out after 3s')), timeoutMs)
  );
  return Promise.race([migrationQueue.add(data, { jobId: data.batchId }), timeoutPromise]);
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
