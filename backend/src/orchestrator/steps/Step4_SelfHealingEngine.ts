import { MigrationContext } from '../MigrationContext';
import { StepResult, makePassResult, makeHaltResult } from '../StepResult';
import { SelectorParser } from '../../healing/SelectorParser';
import { FallbackGenerator } from '../../healing/FallbackGenerator';
import { AnnotationWriter } from '../../healing/AnnotationWriter';

/**
 * Step 4 — Self-Healing Application
 *
 * 1. Parses all selector calls from ctx.migratedCode
 * 2. Generates a 6-level fallback chain for each selector
 * 3. Inserts [SELF-HEAL] comment blocks above each selector line
 * 4. Stores the annotated output in ctx.healedCode
 */
export class Step4_SelfHealingEngine {
  readonly stepNumber = 4;
  readonly stepName = 'Self-Healing Application';

  async run(ctx: MigrationContext): Promise<StepResult> {
    const start = Date.now();

    if (!ctx.migratedCode) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        'No migrated code available. Step 3 must pass before Step 4.',
        Date.now() - start
      );
    }

    try {
      // 1. Parse selectors from the migrated code
      const selectors = SelectorParser.parse(ctx.migratedCode);

      // 2. Generate fallback chains (even if 0 selectors found — code passes through)
      const chains = FallbackGenerator.generateAll(selectors);

      // 3. Inject [SELF-HEAL] annotation comment blocks
      const result = AnnotationWriter.annotate(ctx.migratedCode, chains);

      ctx.healedCode = result.annotatedCode;

      return makePassResult(
        this.stepNumber,
        this.stepName,
        {
          selectorsFound: selectors.length,
          selectorsAnnotated: result.selectorsAnnotated,
          linesAnnotated: result.linesAnnotated,
          frameworks: [...new Set(selectors.map((s) => s.framework))],
          selectorTypes: [...new Set(selectors.map((s) => s.type))],
          generatedBy: ctx.agentUsed ?? 'n/a',
          confidence: ctx.confidence != null ? `${(ctx.confidence * 100).toFixed(0)}%` : 'n/a',
        },
        Date.now() - start
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `Self-healing pipeline failed: ${message}`,
        Date.now() - start
      );
    }
  }
}
