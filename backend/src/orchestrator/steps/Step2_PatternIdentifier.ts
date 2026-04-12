import { MigrationContext } from '../MigrationContext';
import { StepResult, makePassResult, makeHaltResult } from '../StepResult';

const KNOWN_PATTERNS = [
  'POM',         // Page Object Model
  'Cucumber',    // BDD / Gherkin
  'Mocha',       // Mocha / Jasmine spec style
  'PageFactory', // Selenium PageFactory
  'Robot',       // Robot Framework keyword style
  'BasicSpec',   // Flat spec without explicit pattern
] as const;

type KnownPattern = (typeof KNOWN_PATTERNS)[number];

/** Simple keyword heuristics — LLM-backed detection wired in Phase 5. */
function detectPattern(sourceCode: string, framework: string): KnownPattern | null {
  const code = sourceCode.toLowerCase();

  if (framework === 'robot' || code.includes('*** test cases ***') || code.includes('*** keywords ***')) {
    return 'Robot';
  }
  if (code.includes('feature:') || code.includes('scenario:') || code.includes('given ') || code.includes('.feature')) {
    return 'Cucumber';
  }
  if (code.includes('@pagefactory') || code.includes('initElements(')) {
    return 'PageFactory';
  }
  if (
    code.includes('class') &&
    (code.includes('getdriver') || code.includes('this.driver') || code.includes('webdriver'))
  ) {
    return 'POM';
  }
  if (code.includes('describe(') || code.includes('it(') || code.includes('beforeEach(')) {
    return 'Mocha';
  }
  return 'BasicSpec';
}

export class Step2_PatternIdentifier {
  readonly stepNumber = 2;
  readonly stepName = 'Pattern Identification';

  async run(ctx: MigrationContext): Promise<StepResult> {
    const start = Date.now();

    const framework = ctx.detectedFramework ?? ctx.declaredSourceFramework;
    const pattern = detectPattern(ctx.sourceCode, framework);

    if (!pattern) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        'Could not identify a known test pattern from source code. Manual review required.',
        Date.now() - start
      );
    }

    ctx.detectedPattern = pattern;

    return makePassResult(
      this.stepNumber,
      this.stepName,
      { detectedPattern: pattern, framework },
      Date.now() - start
    );
  }
}
