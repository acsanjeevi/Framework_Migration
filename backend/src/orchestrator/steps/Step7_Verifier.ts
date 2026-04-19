import { MigrationContext } from '../MigrationContext';
import { StepResult, makePassResult, makeHaltResult } from '../StepResult';

const CONFIDENCE_THRESHOLD = 0.85;
const LINE_THRESHOLD = 90;
const BRANCH_THRESHOLD = 85;

/**
 * Step 7 — Final Verification & Scoring.
 *
 * Hard gate (HALT):  confidence < 85%, missing healedCode, missing cicdYaml
 * Soft gate (WARN):  coverage below thresholds — logged but does NOT block output
 *                    because the coverage runners are static stubs until real
 *                    analysis (Istanbul/JaCoCo/CoveragePy) is wired.
 */
export class Step7_Verifier {
  readonly stepNumber = 7;
  readonly stepName = 'Final Verification';

  async run(ctx: MigrationContext): Promise<StepResult> {
    const start = Date.now();

    const confidence = ctx.confidence ?? 0;
    const linePct = ctx.coverage?.linePct ?? 0;
    const branchPct = ctx.coverage?.branchPct ?? 0;

    // ── Hard failures — these block output ──────────────────────────────────
    const hardFailures: string[] = [];

    if (confidence < CONFIDENCE_THRESHOLD) {
      hardFailures.push(
        `Confidence ${(confidence * 100).toFixed(1)}% < required ${(CONFIDENCE_THRESHOLD * 100)}%`
      );
    }
    if (!ctx.healedCode) {
      hardFailures.push('Healed code is missing — Step 4 may not have completed.');
    }
    if (!ctx.cicdYaml) {
      hardFailures.push('CI/CD YAML is missing — Step 5 may not have completed.');
    }

    if (hardFailures.length > 0) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `Verification failed:\n${hardFailures.map((f) => `  • ${f}`).join('\n')}`,
        Date.now() - start
      );
    }

    // ── Soft warnings — logged but do not block output ───────────────────────
    const coverageWarnings: string[] = [];
    if (linePct < LINE_THRESHOLD) {
      coverageWarnings.push(`Line coverage ${linePct}% < recommended ${LINE_THRESHOLD}%`);
    }
    if (branchPct < BRANCH_THRESHOLD) {
      coverageWarnings.push(`Branch coverage ${branchPct}% < recommended ${BRANCH_THRESHOLD}%`);
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
        coverageWarnings: coverageWarnings.length > 0 ? coverageWarnings : null,
      },
      Date.now() - start,
      confidence
    );
  }
}

