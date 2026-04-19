import { MigrationContext } from '../MigrationContext';
import { StepResult, makePassResult, makeHaltResult } from '../StepResult';
import { AgentRouter } from '../../agents/AgentRouter';
import { createLLMConfigFromOverride } from '../../agents/providers/LLMProviderFactory';

/**
 * Step 3 — Code Transformation.
 *
 * Uses AgentRouter: tries Haiku 4.5 first; escalates to Sonnet 4.6 if confidence < 85%.
 * If ANTHROPIC_API_KEY is not set the step halts with a clear message.
 * If both agents return confidence < 85% the step halts with a human review flag.
 */
export class Step3_CodeTransformer {
  readonly stepNumber = 3;
  readonly stepName = 'Code Transformation';

  private readonly CONFIDENCE_THRESHOLD = 0.85;
  private readonly MIN_ACCEPTABLE_CONFIDENCE = 0.60;

  async run(ctx: MigrationContext): Promise<StepResult> {
    const start = Date.now();

    // Guard: need an API key — either from per-request llmConfig or env vars
    const hasRequestKey = !!ctx.llmConfig?.apiKey;
    const hasEnvKey =
      !!process.env.ANTHROPIC_API_KEY ||
      !!process.env.OPENAI_API_KEY ||
      !!process.env.GROQ_API_KEY;

    if (!hasRequestKey && !hasEnvKey) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        'No LLM API key available. Set an API key in the Settings dialog or configure an *_API_KEY environment variable.',
        Date.now() - start
      );
    }

    let router: AgentRouter;
    try {
      if (ctx.llmConfig?.apiKey) {
        const llmConfig = createLLMConfigFromOverride(ctx.llmConfig);
        router = new AgentRouter(llmConfig);
      } else {
        router = new AgentRouter();
      }
    } catch (err: unknown) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `Failed to initialise LLM agents: ${err instanceof Error ? err.message : String(err)}`,
        Date.now() - start
      );
    }

    let response;
    try {
      response = await router.route({
        sourceFramework: ctx.detectedFramework ?? ctx.declaredSourceFramework,
        targetLanguage: ctx.targetLanguage,
        detectedPattern: ctx.detectedPattern ?? 'BasicSpec',
        sourceCode: ctx.sourceCode,
      }, ctx._logger);
    } catch (err: unknown) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `LLM API call failed: ${err instanceof Error ? err.message : String(err)}`,
        Date.now() - start
      );
    }

    if (response.clarificationNeeded) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `Model requested clarification: ${response.clarificationReason ?? 'unknown reason'}`,
        Date.now() - start
      );
    }

    if (response.confidence < this.MIN_ACCEPTABLE_CONFIDENCE) {
      return makeHaltResult(
        this.stepNumber,
        this.stepName,
        `LLM confidence ${(response.confidence * 100).toFixed(1)}% is critically low (< ${(this.MIN_ACCEPTABLE_CONFIDENCE * 100)}%) after both primary and fallback models. Human review required.`,
        Date.now() - start
      );
    }

    ctx.migratedCode = response.migratedCode;
    ctx.confidence = response.confidence;
    ctx.agentUsed = response.agentUsed;

    // Tag as low-confidence so the UI can warn the user without blocking the pipeline
    if (response.lowConfidence || response.confidence < this.CONFIDENCE_THRESHOLD) {
      ctx.agentUsed = `${response.agentUsed} ⚠ low-confidence`;
    }

    return makePassResult(
      this.stepNumber,
      this.stepName,
      {
        agentUsed: response.agentUsed,
        confidence: response.confidence,
        escalated: response.escalated,
        lowConfidence: response.lowConfidence ?? (response.confidence < this.CONFIDENCE_THRESHOLD),
        haikuConfidence: response.primaryConfidence ?? null,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        codeLength: response.migratedCode.length,
      },
      Date.now() - start,
      response.confidence
    );
  }
}

