import { MigrationContext } from '../MigrationContext';
import { StepResult, makePassResult, makeHaltResult } from '../StepResult';

const KNOWN_FRAMEWORKS = [
  'cypress',
  'selenium',
  'robot',
  'webdriverio',
  'testcafe',
  'nightwatch',
] as const;

type KnownFramework = (typeof KNOWN_FRAMEWORKS)[number];

export class Step1_FrameworkDetector {
  readonly stepNumber = 1;
  readonly stepName = 'Framework Detection';

  async run(ctx: MigrationContext): Promise<StepResult> {
    const start = Date.now();

    const declared = ctx.declaredSourceFramework.toLowerCase().trim() as KnownFramework;

    if (!KNOWN_FRAMEWORKS.includes(declared)) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `Unknown source framework: '${declared}'. Supported: ${KNOWN_FRAMEWORKS.join(', ')}`,
        Date.now() - start
      );
    }

    // Stub: framework detection via LLM will be wired in Phase 5.
    // For now, accept the user-declared framework as the detected framework.
    ctx.detectedFramework = declared;

    return makePassResult(
      this.stepNumber,
      this.stepName,
      { detectedFramework: declared },
      Date.now() - start
    );
  }
}
