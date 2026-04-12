import { MigrationContext } from '../MigrationContext';
import { StepResult, makePassResult, makeHaltResult } from '../StepResult';
import { CoverageReporter } from '../../coverage/CoverageReporter';

const LINE_THRESHOLD = 90;
const BRANCH_THRESHOLD = 85;

/**
 * Step 6 — Coverage Analysis
 *
 * Routes to the appropriate static analyser (IstanbulRunner / JaCoCoRunner /
 * CoveragePyRunner) based on ctx.targetLanguage, then stores the result in
 * ctx.coverage for Step 7's verification gate.
 */
export class Step6_CoverageAnalyzer {
  readonly stepNumber = 6;
  readonly stepName = 'Coverage Analysis';

  async run(ctx: MigrationContext): Promise<StepResult> {
    const start = Date.now();

    if (!ctx.cicdYaml) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        'No CI/CD YAML available. Step 5 must pass before Step 6.',
        Date.now() - start
      );
    }

    try {
      // Analyse the healed code (falls back to migratedCode if unavailable)
      const codeToAnalyse = ctx.healedCode ?? ctx.migratedCode ?? ctx.sourceCode;
      const result = CoverageReporter.analyse(codeToAnalyse, ctx.targetLanguage);

      ctx.coverage = { linePct: result.linePct, branchPct: result.branchPct };

      const belowThreshold =
        result.linePct < LINE_THRESHOLD || result.branchPct < BRANCH_THRESHOLD;

      return makePassResult(
        this.stepNumber,
        this.stepName,
        {
          runner: result.runner,
          analysisMethod: result.analysisMethod,
          linePct: result.linePct,
          branchPct: result.branchPct,
          lineThreshold: LINE_THRESHOLD,
          branchThreshold: BRANCH_THRESHOLD,
          details: result.details,
          warning: belowThreshold
            ? `Coverage below threshold — suggest adding test stubs`
            : null,
        },
        Date.now() - start
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `Coverage analysis failed: ${message}`,
        Date.now() - start
      );
    }
  }
}
