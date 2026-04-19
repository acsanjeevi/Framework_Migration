import { MigrationContext } from './MigrationContext';
import { StepResult } from './StepResult';
import { Step1_FrameworkDetector } from './steps/Step1_FrameworkDetector';
import { Step2_PatternIdentifier } from './steps/Step2_PatternIdentifier';
import { Step3_CodeTransformer } from './steps/Step3_CodeTransformer';
import { Step4_SelfHealingEngine } from './steps/Step4_SelfHealingEngine';
import { Step5_CICDGenerator } from './steps/Step5_CICDGenerator';
import { Step6_CoverageAnalyzer } from './steps/Step6_CoverageAnalyzer';
import { Step7_Verifier } from './steps/Step7_Verifier';
import { MigrationLogger } from '../logger/MigrationLogger';

export interface OrchestratorResult {
  jobId: string;
  fileName: string;
  overallStatus: 'complete' | 'failed' | 'halted';
  steps: StepResult[];
  /** Set when all 7 steps pass */
  output: {
    healedCode: string | null;
    cicdYaml: string | null;
    confidence: number | null;
    coverage: { linePct: number; branchPct: number } | null;
    /** Model ID used (e.g. 'claude-haiku-4-5', 'gpt-4o-mini') */
    agentUsed: string | null;
  };
  totalDurationMs: number;
}

/** Progress callback signature — wired to ProgressEmitter in Phase 4. */
export type ProgressCallback = (update: {
  fileName: string;
  stepNumber: number;
  stepName: string;
  percentage: number;
}) => void;

/** Maps step number (1-7) to a % progress value reported to the UI. */
const STEP_PROGRESS: Record<number, number> = {
  1: 10,
  2: 25,
  3: 50,
  4: 65,
  5: 80,
  6: 90,
  7: 100,
};

export class MigrationOrchestrator {
  private readonly steps = [
    new Step1_FrameworkDetector(),
    new Step2_PatternIdentifier(),
    new Step3_CodeTransformer(),
    new Step4_SelfHealingEngine(),
    new Step5_CICDGenerator(),
    new Step6_CoverageAnalyzer(),
    new Step7_Verifier(),
  ];

  /**
   * Run all 7 steps sequentially for a single file.
   * Stops immediately when any step returns status 'fail' or 'halt'.
   * Calls onProgress after each step completes.
   */
  async run(
    ctx: MigrationContext,
    onProgress?: ProgressCallback
  ): Promise<OrchestratorResult> {
    const wallStart = Date.now();
    const completedSteps: StepResult[] = [];

    // ── Create per-job logger ───────────────────────────────────────────────
    const logger = new MigrationLogger(ctx.jobId, ctx.fileName);
    ctx._logger = logger;  // make available to all steps via context
    logger.info(null, null, 'JOB_CONFIG', 'Job configuration', {
      sourceFramework: ctx.declaredSourceFramework,
      targetLanguage: ctx.targetLanguage,
      cicdPlatform: ctx.cicdPlatform,
      provider: ctx.llmConfig?.provider ?? process.env.LLM_PROVIDER ?? 'anthropic',
      primaryModel: ctx.llmConfig?.primaryModel ?? process.env.LLM_PRIMARY_MODEL ?? '(env default)',
    });

    for (const step of this.steps) {
      let result: StepResult;

      logger.stepStart(step.stepNumber, step.stepName, {
        contextKeys: Object.keys(ctx).filter(k => k !== 'sourceCode' && k !== 'llmConfig'),
      });

      const stepStart = Date.now();
      try {
        result = await step.run(ctx);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const dur = Date.now() - stepStart;
        result = {
          stepNumber: step.stepNumber,
          stepName: step.stepName,
          status: 'halt',
          confidence: null,
          data: null,
          errorReason: `Unexpected error in step ${step.stepNumber}: ${message}`,
          durationMs: dur,
        };
        logger.error(step.stepNumber, step.stepName, 'STEP_EXCEPTION', `Unhandled exception: ${message}`, {
          stack: err instanceof Error ? err.stack : undefined,
        });
      }

      // ── Log step outcome ──────────────────────────────────────────────────
      if (result.status === 'pass') {
        logger.stepPass(step.stepNumber, step.stepName, result.durationMs, result.data ?? undefined);
      } else if (result.status === 'fail') {
        logger.stepFail(step.stepNumber, step.stepName, result.errorReason ?? 'unknown', result.durationMs);
      } else {
        logger.stepHalt(step.stepNumber, step.stepName, result.errorReason ?? 'unknown', result.durationMs);
      }

      completedSteps.push(result);

      if (onProgress) {
        onProgress({
          fileName: ctx.fileName,
          stepNumber: step.stepNumber,
          stepName: step.stepName,
          percentage: STEP_PROGRESS[step.stepNumber] ?? 0,
        });
      }

      // Gate: stop the pipeline on any non-pass result
      if (result.status !== 'pass') {
        const totalMs = Date.now() - wallStart;
        const overallStatus = result.status === 'fail' ? 'failed' : 'halted';
        logger.jobComplete(overallStatus, totalMs, {
          stepsCompleted: completedSteps.length,
          stoppedAtStep: step.stepNumber,
          stoppedAtStepName: step.stepName,
          reason: result.errorReason,
          logFile: logger.logFilePath,
        });
        return {
          jobId: ctx.jobId,
          fileName: ctx.fileName,
          overallStatus,
          steps: completedSteps,
          output: {
            healedCode: ctx.healedCode ?? null,
            cicdYaml: ctx.cicdYaml ?? null,
            confidence: ctx.confidence ?? null,
            coverage: ctx.coverage ?? null,
            agentUsed: ctx.agentUsed ?? null,
          },
          totalDurationMs: totalMs,
        };
      }
    }

    const totalMs = Date.now() - wallStart;
    logger.jobComplete('complete', totalMs, {
      stepsCompleted: completedSteps.length,
      confidence: ctx.confidence,
      agentUsed: ctx.agentUsed,
      logFile: logger.logFilePath,
    });

    return {
      jobId: ctx.jobId,
      fileName: ctx.fileName,
      overallStatus: 'complete',
      steps: completedSteps,
      output: {
        healedCode: ctx.healedCode ?? null,
        cicdYaml: ctx.cicdYaml ?? null,
        confidence: ctx.confidence ?? null,
        coverage: ctx.coverage ?? null,
        agentUsed: ctx.agentUsed ?? null,
      },
      totalDurationMs: totalMs,
    };
  }

  /**
   * Dry-run: instantiate all steps and confirm they construct without errors.
   * Used by GET /health/orchestrator.
   * Returns an array of { stepNumber, stepName, healthy } objects.
   */
  static dryRunHealthCheck(): Array<{ stepNumber: number; stepName: string; healthy: boolean; error: string | null }> {
    const candidates = [
      Step1_FrameworkDetector,
      Step2_PatternIdentifier,
      Step3_CodeTransformer,
      Step4_SelfHealingEngine,
      Step5_CICDGenerator,
      Step6_CoverageAnalyzer,
      Step7_Verifier,
    ];

    return candidates.map((StepClass) => {
      try {
        const instance = new StepClass();
        return { stepNumber: instance.stepNumber, stepName: instance.stepName, healthy: true, error: null };
      } catch (err: unknown) {
        return {
          stepNumber: -1,
          stepName: StepClass.name,
          healthy: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    });
  }
}
