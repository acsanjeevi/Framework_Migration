import { AgentCallParams, AgentResponse } from './AgentTypes';
import { GenericMigrationAgent } from './GenericMigrationAgent';
import { createLLMConfig, LLMConfig } from './providers/LLMProviderFactory';
import { MigrationLogger } from '../logger/MigrationLogger';

const CONFIDENCE_THRESHOLD = 0.85;
/**
 * Minimum acceptable confidence — below this even the fallback result is marked
 * `lowConfidence` but still returned so the file is not hard-halted.
 * Human review is recommended for these files.
 */
const MIN_ACCEPTABLE_CONFIDENCE = 0.60;

export interface RouterResult extends AgentResponse {
  agentUsed: string;
  escalated: boolean;
  primaryConfidence?: number;
  /** True when best result is below MIN_ACCEPTABLE_CONFIDENCE — file passes but flagged for review */
  lowConfidence?: boolean;
}

/**
 * Routes a code transformation request through the configured LLM provider:
 *  1. Try primary model (cheap/fast)
 *  2. If confidence < 85%, escalate to fallback model (high-accuracy)
 *
 * Provider and models are resolved from environment variables:
 *   LLM_PROVIDER=anthropic|openai|groq   (default: anthropic)
 *   LLM_PRIMARY_MODEL=<model-id>          (optional override)
 *   LLM_FALLBACK_MODEL=<model-id>         (optional override)
 */
export class AgentRouter {
  private readonly primary: GenericMigrationAgent;
  private readonly fallback: GenericMigrationAgent;
  private readonly primaryModel: string;
  private readonly fallbackModel: string;

  /**
   * @param prebuiltConfig — optional pre-built config (from per-request override).
   *   If omitted, reads from environment variables via createLLMConfig().
   */
  constructor(prebuiltConfig?: LLMConfig) {
    const config = prebuiltConfig ?? createLLMConfig();
    this.primaryModel = config.primaryModel;
    this.fallbackModel = config.fallbackModel;

    this.primary = new GenericMigrationAgent({
      provider: config.provider,
      modelId: config.primaryModel,
      maxTokens: 4096,
      isHighAccuracy: false,
    });

    this.fallback = new GenericMigrationAgent({
      provider: config.provider,
      modelId: config.fallbackModel,
      maxTokens: 8192,
      isHighAccuracy: true,
    });
  }

  async route(params: AgentCallParams, logger?: MigrationLogger): Promise<RouterResult> {
    const stepNum = 3;
    const stepName = 'Code Transformation';

    // ── Step 1: Try primary model ────────────────────────────────────────
    logger?.llmCall(stepNum, stepName, this.primaryModel, 'primary',
      `Framework: ${params.sourceFramework} → ${params.targetLanguage} | Pattern: ${params.detectedPattern}`);

    let primaryResponse: AgentResponse;
    try {
      primaryResponse = await this.primary.transform(params);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger?.llmError(stepNum, stepName, this.primaryModel, msg);
      throw err;
    }

    logger?.llmResponse(stepNum, stepName, this.primaryModel,
      primaryResponse.confidence,
      primaryResponse.usage?.inputTokens ?? 0,
      primaryResponse.usage?.outputTokens ?? 0,
      false
    );
    logger?.debug(stepNum, stepName, 'LLM_OUTPUT_PRIMARY', 'Raw primary model output (first 500 chars)', {
      output: primaryResponse.migratedCode?.slice(0, 500),
      clarificationNeeded: primaryResponse.clarificationNeeded,
    });

    if (!primaryResponse.clarificationNeeded && primaryResponse.confidence >= CONFIDENCE_THRESHOLD) {
      return {
        ...primaryResponse,
        agentUsed: this.primaryModel,
        escalated: false,
      };
    }

    const primaryConfidence = primaryResponse.confidence;

    // ── Step 2: Escalate to fallback model ──────────────────────────────
    logger?.warn(stepNum, stepName, 'LLM_ESCALATE',
      `Primary model ${this.primaryModel} confidence ${(primaryConfidence * 100).toFixed(1)}% < ${CONFIDENCE_THRESHOLD * 100}% — escalating to ${this.fallbackModel}`
    );
    console.log(
      `[agent-router] ${this.primaryModel} confidence ${(primaryConfidence * 100).toFixed(1)}%` +
        ` < ${CONFIDENCE_THRESHOLD * 100}% threshold — escalating to ${this.fallbackModel}`
    );

    logger?.llmCall(stepNum, stepName, this.fallbackModel, 'fallback',
      `Framework: ${params.sourceFramework} → ${params.targetLanguage} | Pattern: ${params.detectedPattern}`);

    let fallbackResponse: AgentResponse;
    try {
      fallbackResponse = await this.fallback.transform(params);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger?.llmError(stepNum, stepName, this.fallbackModel, msg);
      throw err;
    }

    logger?.llmResponse(stepNum, stepName, this.fallbackModel,
      fallbackResponse.confidence,
      fallbackResponse.usage?.inputTokens ?? 0,
      fallbackResponse.usage?.outputTokens ?? 0,
      true
    );
    logger?.debug(stepNum, stepName, 'LLM_OUTPUT_FALLBACK', 'Raw fallback model output (first 500 chars)', {
      output: fallbackResponse.migratedCode?.slice(0, 500),
      clarificationNeeded: fallbackResponse.clarificationNeeded,
    });

    return {
      ...fallbackResponse,
      agentUsed: this.fallbackModel,
      escalated: true,
      primaryConfidence,
      // Flag low-confidence results for human review rather than hard-halting
      lowConfidence: fallbackResponse.confidence < MIN_ACCEPTABLE_CONFIDENCE,
    };
  }
}
