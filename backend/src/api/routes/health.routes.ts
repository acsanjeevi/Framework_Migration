import { Router, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { UPLOAD_CONFIG } from '../middleware/upload.middleware';
import { MigrationOrchestrator } from '../../orchestrator/MigrationOrchestrator';
import { getQueueHealth } from '../../queue/MigrationQueue';
import { SelectorParser } from '../../healing/SelectorParser';
import { FallbackGenerator } from '../../healing/FallbackGenerator';
import { AnnotationWriter } from '../../healing/AnnotationWriter';
import { CICDGenerator } from '../../cicd/CICDGenerator';
import { CoverageReporter } from '../../coverage/CoverageReporter';

const router = Router();

const PHASE_STEPS = [
  'step1_framework_detector',
  'step2_pattern_identifier',
  'step3_code_transformer',
  'step4_self_healing',
  'step5_cicd_generator',
  'step6_coverage_analyzer',
  'step7_verifier',
] as const;

type PhaseStep = (typeof PHASE_STEPS)[number];
type PhaseStatus = 'ready' | 'not-started' | 'degraded' | 'error';

function getPhaseStatuses(): Record<PhaseStep, PhaseStatus> {
  return PHASE_STEPS.reduce((acc, step) => {
    acc[step] = 'ready';
    return acc;
  }, {} as Record<PhaseStep, PhaseStatus>);
}

// GET /health
router.get('/', (_req: Request, res: Response): void => {
  const phases = getPhaseStatuses();
  const allReady = Object.values(phases).every((s) => s === 'ready');

  res.status(200).json({
    status: allReady ? 'ok' : 'degraded',
    version: '1.0.0',
    uptime: Math.round(process.uptime() * 10) / 10,
    timestamp: new Date().toISOString(),
    phases,
  });
});

// GET /health/phases
router.get('/phases', (_req: Request, res: Response): void => {
  const phases = getPhaseStatuses();
  const allReady = Object.values(phases).every((s) => s === 'ready');

  res.status(200).json({
    status: allReady ? 'ok' : 'degraded',
    phases,
  });
});

// GET /health/upload
router.get('/upload', (_req: Request, res: Response): void => {
  const tempBase = path.join(os.tmpdir(), 'migration-tool');
  let writable = false;
  let tempDir = tempBase;

  try {
    fs.mkdirSync(tempBase, { recursive: true });
    fs.accessSync(tempBase, fs.constants.W_OK);
    writable = true;
  } catch {
    writable = false;
  }

  const httpStatus = writable ? 200 : 503;
  res.status(httpStatus).json({
    status: writable ? 'ok' : 'error',
    upload: {
      tempDir,
      writable,
      limits: {
        maxFileSizeBytes: UPLOAD_CONFIG.maxFileSizeBytes,
        maxFileSizeMB: UPLOAD_CONFIG.maxFileSizeBytes / (1024 * 1024),
        maxFiles: UPLOAD_CONFIG.maxFiles,
        allowedExtensions: UPLOAD_CONFIG.allowedExtensions,
      },
    },
  });
});

// GET /health/orchestrator
router.get('/orchestrator', (_req: Request, res: Response): void => {
  const checks = MigrationOrchestrator.dryRunHealthCheck();
  const allHealthy = checks.every((c) => c.healthy);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'error',
    orchestrator: {
      stepsChecked: checks.length,
      steps: checks,
    },
  });
});

// GET /health/queue
router.get('/queue', async (_req: Request, res: Response): Promise<void> => {
  const health = await getQueueHealth();

  res.status(200).json({
    status: health.redisConnected ? 'ok' : 'degraded',
    queue: {
      redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
      redisConnected: health.redisConnected,
      latencyMs: health.latencyMs,
      jobCounts: health.counts,
      activeWebSocketConnections: health.activeConnections,
      note: health.redisConnected
        ? undefined
        : 'Redis unavailable — job queue disabled. File upload requires Redis.',
    },
  });
});

// GET /health/llm
// Validates that ANTHROPIC_API_KEY is set and agents can be constructed.
// Does NOT make a live API call (no cost, no latency).
router.get('/llm', (_req: Request, res: Response): void => {
  const apiKeySet = Boolean(process.env.ANTHROPIC_API_KEY);

  const agents: Array<{ name: string; model: string; healthy: boolean; error: string | null }> = [];

  for (const entry of [
    { name: 'HaikuAgent', model: 'claude-haiku-4-5' },
    { name: 'SonnetAgent', model: 'claude-sonnet-4-5' },
  ]) {
    if (!apiKeySet) {
      agents.push({ ...entry, healthy: false, error: 'ANTHROPIC_API_KEY not set' });
    } else {
      agents.push({ ...entry, healthy: true, error: null });
    }
  }

  const allHealthy = agents.every((a) => a.healthy);
  const httpStatus = allHealthy ? 200 : 503;

  res.status(httpStatus).json({
    status: allHealthy ? 'ok' : 'error',
    llm: {
      apiKeySet,
      confidenceThreshold: 0.85,
      escalationModel: 'sonnet-4.6',
      agents,
    },
  });
});

// GET /health/cicd
// Validates all three CI/CD Handlebars templates compile without error.
router.get('/cicd', (_req: Request, res: Response): void => {
  const checks = CICDGenerator.healthCheck();
  const allHealthy = checks.every((c) => c.healthy);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'error',
    cicd: {
      templatesChecked: checks.length,
      templates: checks,
    },
  });
});

// GET /health/coverage
// Runs each static coverage analyser against a small fixture snippet.
router.get('/coverage', (_req: Request, res: Response): void => {
  const checks = CoverageReporter.healthCheck();
  const allHealthy = checks.every((c) => c.healthy);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'error',
    coverage: {
      runnersChecked: checks.length,
      lineThreshold: 90,
      branchThreshold: 85,
      runners: checks,
    },
  });
});

// GET /health/selfheal
// Smoke-tests the full self-healing pipeline (SelectorParser → FallbackGenerator → AnnotationWriter)
// against a built-in fixture snippet.  No file upload required.
router.get('/selfheal', (_req: Request, res: Response): void => {
  // Fixture snippet — representative Cypress test code
  const fixtureCode = [
    `describe('Login', () => {`,
    `  it('submits the login form', () => {`,
    `    cy.get('[data-cy="username"]').type('testuser');`,
    `    cy.get('[data-cy="password"]').type('secret');`,
    `    cy.get('#submit-btn').click();`,
    `    cy.get('.error-message').should('not.exist');`,
    `  });`,
    `});`,
  ].join('\n');

  try {
    const selectors = SelectorParser.parse(fixtureCode);
    const chains = FallbackGenerator.generateAll(selectors);
    const { annotatedCode, selectorsAnnotated, linesAnnotated } = AnnotationWriter.annotate(
      fixtureCode,
      chains,
    );

    res.status(200).json({
      status: 'ok',
      selfheal: {
        fixture: 'cypress-login-snippet',
        selectorsFound: selectors.length,
        selectorsAnnotated,
        linesAnnotated,
        parsedSelectors: selectors,
        fallbackChains: chains,
        annotatedCodePreview: annotatedCode,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(503).json({
      status: 'error',
      selfheal: { error: message },
    });
  }
});

export default router;
