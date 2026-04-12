import { MigrationContext } from '../MigrationContext';
import { StepResult, makePassResult, makeHaltResult } from '../StepResult';
import { CICDGenerator } from '../../cicd/CICDGenerator';

/**
 * Step 5 — CI/CD YAML Generation
 *
 * Compiles the Handlebars template for the target platform and writes
 * the rendered pipeline config into ctx.cicdYaml.
 */
export class Step5_CICDGenerator {
  readonly stepNumber = 5;
  readonly stepName = 'CI/CD YAML Generation';

  async run(ctx: MigrationContext): Promise<StepResult> {
    const start = Date.now();

    if (!ctx.healedCode) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        'No healed code available. Step 4 must pass before Step 5.',
        Date.now() - start
      );
    }

    try {
      const result = CICDGenerator.generate({
        sourceFramework: ctx.declaredSourceFramework,
        targetLanguage: ctx.targetLanguage,
        cicdPlatform: ctx.cicdPlatform,
        coverage: ctx.coverage ?? { linePct: 0, branchPct: 0 },
      });

      ctx.cicdYaml = result.yaml;

      return makePassResult(
        this.stepNumber,
        this.stepName,
        {
          platform: result.platform,
          outputFile: result.fileName,
          yamlLength: result.yaml.length,
        },
        Date.now() - start
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `CI/CD generation failed: ${message}`,
        Date.now() - start
      );
    }
  }
}
