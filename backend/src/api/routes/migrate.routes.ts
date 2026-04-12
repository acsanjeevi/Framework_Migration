import { Router, Request, Response } from 'express';
import archiver from 'archiver';
import { assignUploadSession, handleUpload } from '../middleware/upload.middleware';
import { validateUploadBody } from '../middleware/validation.middleware';
import { enqueueJob, migrationQueue, MigrationJobData } from '../../queue/MigrationQueue';
import { ResultStore } from '../../store/ResultStore';

const router = Router();

/**
 * POST /api/migrate/upload
 * Accepts multipart/form-data with:
 *   - files[]       : source test files
 *   - sourceFramework, targetLanguage, cicdPlatform : body fields validated by Zod
 */
router.post(
  '/upload',
  assignUploadSession,
  handleUpload,
  validateUploadBody,
  async (req: Request, res: Response): Promise<void> => {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({ status: 'error', message: 'No files uploaded' });
      return;
    }

    const batchId = `batch_${Date.now()}_${req.uploadSessionId ?? 'unknown'}`;
    const body = req.body as {
      sourceFramework: string;
      targetLanguage: 'typescript' | 'javascript' | 'java' | 'python';
      cicdPlatform: 'azure' | 'gitlab' | 'jenkins';
      // Optional per-request LLM override (from frontend Settings dialog)
      llmProvider?: string;
      llmApiKey?: string;
      llmPrimaryModel?: string;
      llmFallbackModel?: string;
    };

    // Build optional LLM config — only include when an API key is provided
    const llmConfig =
      body.llmProvider && body.llmApiKey
        ? {
            provider: (body.llmProvider === 'openai' ? 'openai'
              : body.llmProvider === 'groq' ? 'groq'
              : 'anthropic') as 'anthropic' | 'openai' | 'groq',
            apiKey: body.llmApiKey,
            primaryModel: body.llmPrimaryModel ?? '',
            fallbackModel: body.llmFallbackModel ?? '',
          }
        : undefined;

    const jobData: MigrationJobData = {
      batchId,
      files: files.map((f) => ({
        fileName: f.originalname,
        filePath: f.path,
      })),
      config: {
        sourceFramework: body.sourceFramework,
        targetLanguage: body.targetLanguage,
        cicdPlatform: body.cicdPlatform,
      },
      ...(llmConfig ? { llmConfig } : {}),
    };

    try {
      await enqueueJob(jobData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(503).json({
        status: 'error',
        message: `Queue unavailable — ensure Redis is running. Details: ${message}`,
      });
      return;
    }

    res.status(202).json({
      status: 'accepted',
      jobId: batchId,
      fileCount: files.length,
      files: files.map((f) => ({ name: f.originalname, size: f.size })),
      config: body,
      websocket: `/ws/progress/${batchId}`,
      message: 'Migration job queued — subscribe to websocket for real-time progress',
    });
  }
);

/**
 * GET /api/migrate/status/:jobId
 * Returns the current status of a migration job from the Bull queue.
 */
router.get('/status/:jobId', async (req: Request, res: Response): Promise<void> => {
  const { jobId } = req.params;

  try {
    const job = await migrationQueue.getJob(jobId);
    if (!job) {
      res.status(404).json({ status: 'error', message: `Job '${jobId}' not found` });
      return;
    }
    const state = await job.getState();
    res.status(200).json({
      status: 'ok',
      jobId,
      jobStatus: state,
      progress: job.progress(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({ status: 'error', message: `Queue unavailable: ${message}` });
  }
});

/**
 * GET /api/migrate/result/:jobId
 * Streams a ZIP archive containing:
 *   - migrated/<originalName>.ts  (healedCode per file)
 *   - cicd/<platform-filename>    (cicdYaml, deduplicated)
 *   - summary.json                (same payload as /summary)
 */
router.get('/result/:jobId', (req: Request, res: Response): void => {
  const { jobId } = req.params;
  const batch = ResultStore.get(jobId);

  if (!batch) {
    res.status(404).json({
      status: 'error',
      message: `No result found for jobId '${jobId}'. Has the migration completed?`,
    });
    return;
  }

  const completedFiles = batch.files.filter((f) => f.status === 'complete');
  if (completedFiles.length === 0) {
    res.status(409).json({
      status: 'error',
      message: 'Migration finished but all files failed — no output to download.',
    });
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="migration-${jobId}.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => {
    console.error('[result] Archive error:', err.message);
    // Headers already sent; cannot send JSON error
  });
  archive.pipe(res);

  // 1. Migrated source files
  for (const file of completedFiles) {
    if (file.healedCode) {
      archive.append(file.healedCode, { name: `migrated/${file.fileName}` });
    }
  }

  // 2. CI/CD config — deduplicate (all files share the same platform config)
  const cicdSeen = new Set<string>();
  for (const file of completedFiles) {
    if (file.cicdYaml && file.cicdFileName && !cicdSeen.has(file.cicdFileName)) {
      cicdSeen.add(file.cicdFileName);
      archive.append(file.cicdYaml, { name: `cicd/${file.cicdFileName}` });
    }
  }

  // 3. Summary JSON
  const summary = buildSummary(jobId, batch);
  archive.append(JSON.stringify(summary, null, 2), { name: 'summary.json' });

  archive.finalize();
});

/**
 * GET /api/migrate/summary/:jobId
 * Returns the JSON migration summary (confidence, coverage, per-file results).
 */
router.get('/summary/:jobId', (req: Request, res: Response): void => {
  const { jobId } = req.params;
  const batch = ResultStore.get(jobId);

  if (!batch) {
    res.status(404).json({
      status: 'error',
      message: `No result found for jobId '${jobId}'. Has the migration completed?`,
    });
    return;
  }

  res.status(200).json({
    status: 'ok',
    jobId,
    summary: buildSummary(jobId, batch),
  });
});

// ── Helper ────────────────────────────────────────────────────────────────────
function buildSummary(
  jobId: string,
  batch: ReturnType<typeof ResultStore.get>
): Record<string, unknown> {
  if (!batch) return { jobId, files: [] };

  const completed = batch.files.filter((f) => f.status === 'complete');
  const failed    = batch.files.filter((f) => f.status === 'failed');

  const avgConfidence =
    completed.length > 0
      ? completed.reduce((s, f) => s + (f.confidence ?? 0), 0) / completed.length
      : null;

  const avgLinePct =
    completed.length > 0
      ? completed.reduce((s, f) => s + (f.coverage?.linePct ?? 0), 0) / completed.length
      : null;

  const avgBranchPct =
    completed.length > 0
      ? completed.reduce((s, f) => s + (f.coverage?.branchPct ?? 0), 0) / completed.length
      : null;

  return {
    jobId,
    completedAt: batch.completedAt,
    config: batch.config,
    totals: {
      filesProcessed: batch.files.length,
      filesComplete: completed.length,
      filesFailed: failed.length,
    },
    averages: {
      confidencePct: avgConfidence != null ? Math.round(avgConfidence * 100) : null,
      lineCoveragePct: avgLinePct != null ? Math.round(avgLinePct) : null,
      branchCoveragePct: avgBranchPct != null ? Math.round(avgBranchPct) : null,
    },
    files: batch.files.map((f) => ({
      fileName: f.fileName,
      status: f.status,
      agentUsed: f.agentUsed ?? null,
      confidencePct: f.confidence != null ? Math.round(f.confidence * 100) : null,
      detectedFramework: f.detectedFramework ?? null,
      detectedPattern: f.detectedPattern ?? null,
      coverage: f.coverage ?? null,
      cicdFile: f.cicdFileName ?? null,
      errorReason: f.errorReason ?? null,
    })),
  };
}

export default router;
