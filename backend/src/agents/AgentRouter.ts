import { AgentCallParams, AgentResponse } from './AgentTypes';
import { GenericMigrationAgent } from './GenericMigrationAgent';
import { createLLMConfig, LLMConfig } from './providers/LLMProviderFactory';

const CONFIDENCE_THRESHOLD = 0.85;

export interface RouterResult extends AgentResponse {
  /** Model ID of the agent that produced the final result (e.g. 'claude-haiku-4-5', 'gpt-4o-mini') */
  agentUsed: string;
  /** True when primary model fell below confidence threshold and fallback was used */
  escalated: boolean;
  /** Confidence from the primary model attempt (set only when escalated = true) */
  primaryConfidence?: number;
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

  async route(params: AgentCallParams): Promise<RouterResult> {
    // ── Step 1: Try primary model ────────────────────────────────────────
    const primaryResponse = await this.primary.transform(params);

    if (!primaryResponse.clarificationNeeded && primaryResponse.confidence >= CONFIDENCE_THRESHOLD) {
      return {
        ...primaryResponse,
        agentUsed: this.primaryModel,
        escalated: false,
      };
    }

    const primaryConfidence = primaryResponse.confidence;

    // ── Step 2: Escalate to fallback model ──────────────────────────────
    console.log(
      `[agent-router] ${this.primaryModel} confidence ${(primaryConfidence * 100).toFixed(1)}%` +
        ` < ${CONFIDENCE_THRESHOLD * 100}% threshold — escalating to ${this.fallbackModel}`
    );

    const fallbackResponse = await this.fallback.transform(params);

    return {
      ...fallbackResponse,
      agentUsed: this.fallbackModel,
      escalated: true,
      primaryConfidence,
    };
  }
}
