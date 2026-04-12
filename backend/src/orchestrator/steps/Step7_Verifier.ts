import { MigrationContext } from '../MigrationContext';
import { StepResult, makePassResult, makeHaltResult } from '../StepResult';

const CONFIDENCE_THRESHOLD = 0.85;
const LINE_THRESHOLD = 90;
const BRANCH_THRESHOLD = 85;

/**
 * Step 7 — Final Verification & Scoring.
 *
 * Gate: confidence ≥ 85% AND coverage thresholds met.
 * This skeleton runs the same logic the real verifier will use,
 * sourcing values already set by Steps 3 and 6.
 */
export class Step7_Verifier {
  readonly stepNumber = 7;
  readonly stepName = 'Final Verification';

  async run(ctx: MigrationContext): Promise<StepResult> {
    const start = Date.now();

    const confidence = ctx.confidence ?? 0;
    const linePct = ctx.coverage?.linePct ?? 0;
    const branchPct = ctx.coverage?.branchPct ?? 0;

    const failures: string[] = [];

    if (confidence < CONFIDENCE_THRESHOLD) {
      failures.push(
        `Confidence ${(confidence * 100).toFixed(1)}% < required ${(CONFIDENCE_THRESHOLD * 100)}%`
      );
    }
    if (linePct < LINE_THRESHOLD) {
      failures.push(`Line coverage ${linePct}% < required ${LINE_THRESHOLD}%`);
    }
    if (branchPct < BRANCH_THRESHOLD) {
      failures.push(`Branch coverage ${branchPct}% < required ${BRANCH_THRESHOLD}%`);
    }
    if (!ctx.healedCode) {
      failures.push('Healed code is missing — Step 4 may not have completed.');
    }
    if (!ctx.cicdYaml) {
      failures.push('CI/CD YAML is missing — Step 5 may not have completed.');
    }

    if (failures.length > 0) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `Verification failed:\n${failures.map((f) => `  • ${f}`).join('\n')}`,
        Date.now() - start
      );
    }

    ctx.verified = true;

    return makePassResult(
      this.stepNumber,
      this.stepName,
      {
        confidence,
        linePct,
        branchPct,
        agentUsed: ctx.agentUsed ?? 'unknown',
        cicdPlatform: ctx.cicdPlatform,
        verified: true,
      },
      Date.now() - start,
      confidence
    );
  }
}
