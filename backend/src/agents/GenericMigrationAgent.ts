import { ILLMProvider } from './providers/ILLMProvider';
import { AgentCallParams, AgentResponse } from './AgentTypes';

export interface GenericAgentConfig {
  provider: ILLMProvider;
  modelId: string;
  maxTokens?: number;
  /** When true, uses the high-accuracy fallback system prompt */
  isHighAccuracy?: boolean;
}

/**
 * Provider-agnostic migration agent.
 * Replaces the hard-coded HaikuAgent / SonnetAgent pair.
 * Any ILLMProvider implementation (Anthropic, OpenAI, Groq, …) is injected at construction.
 */
export class GenericMigrationAgent {
  private readonly config: Required<GenericAgentConfig>;

  constructor(config: GenericAgentConfig) {
    this.config = {
      maxTokens: 4096,
      isHighAccuracy: false,
      ...config,
    };
  }

  async transform(params: AgentCallParams): Promise<AgentResponse> {
    const { sourceFramework, targetLanguage, detectedPattern, sourceCode } = params;
    const { provider, modelId, maxTokens, isHighAccuracy } = this.config;

    const systemPrompt = isHighAccuracy
      ? [
          'You are a senior QA Automation Migration Expert operating in HIGH-ACCURACY mode.',
          'A previous migration attempt produced low confidence. Produce a correct, complete migration.',
          'Rules:',
          '- ONLY use selectors, class names and method names from the source file.',
          '- NEVER invent or assume anything not present in the source.',
          '- If source is ambiguous, respond with exactly: CLARIFICATION_NEEDED: <reason>',
          '- Annotate every selector with [SELF-HEAL] primary + fallback options as inline comments.',
          '- Preserve 100% of original test intent and assertions.',
          '- Return ONLY valid code — no markdown fences, no explanations.',
        ].join('\n')
      : [
          'You are a QA Automation Migration Expert. Your ONLY task is to convert the provided source test code to Playwright.',
          'Rules:',
          '- ONLY use selectors, class names and method names from the source file.',
          '- NEVER invent or assume anything not present in the source.',
          '- If source is ambiguous, respond with exactly: CLARIFICATION_NEEDED: <reason>',
          '- Annotate every selector with [SELF-HEAL] primary + fallback options as inline comments.',
          '- Preserve 100% of original test intent and assertions.',
          '- Return ONLY valid code — no markdown fences, no explanations.',
        ].join('\n');

    const userPrompt = [
      `Source Framework : ${sourceFramework}`,
      `Target Language  : Playwright ${targetLanguage}`,
      `Pattern Detected : ${detectedPattern}`,
      ``,
      `Source File:`,
      `${sourceCode}`,
      ``,
      `Convert the above to Playwright ${targetLanguage}. Return ONLY valid code.`,
    ].join('\n');

    const result = await provider.callModel(modelId, systemPrompt, userPrompt, maxTokens);

    if (result.text.startsWith('CLARIFICATION_NEEDED:')) {
      return {
        migratedCode: '',
        confidence: 0,
        usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
        clarificationNeeded: true,
        clarificationReason: result.text.replace('CLARIFICATION_NEEDED:', '').trim(),
      };
    }

    const confidence = computeHeuristicConfidence(sourceCode, result.text);

    return {
      migratedCode: result.text,
      confidence,
      usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
      clarificationNeeded: false,
      clarificationReason: null,
    };
  }
}

/**
 * Heuristic confidence proxy (pre-Phase 7 verifier).
 * Formula: selectors×0.40 + methods×0.30 + assertions×0.20 + pattern fidelity×0.10
 */
function computeHeuristicConfidence(source: string, migrated: string): number {
  const selectorRe = /\[data-testid|getByRole|getByText|getByLabel|#[\w-]+|\.[\w-]+/g;
  const methodRe = /\b(click|fill|type|hover|check|select|press|goto|waitFor)\b/g;
  const assertRe = /\b(expect|assert|should|toBe|toEqual|toContain|toBeVisible)\b/g;

  const score = (pattern: RegExp): number => {
    const srcMatches = new Set((source.match(pattern) ?? []).map((s) => s.toLowerCase()));
    const migMatches = new Set((migrated.match(pattern) ?? []).map((s) => s.toLowerCase()));
    if (srcMatches.size === 0) return 1;
    let hit = 0;
    for (const m of srcMatches) if (migMatches.has(m)) hit++;
    return hit / srcMatches.size;
  };

  return (
    score(selectorRe) * 0.4 +
    score(methodRe) * 0.3 +
    score(assertRe) * 0.2 +
    (/\btest\b|\bdescribe\b/.test(migrated) ? 1 : 0) * 0.1
  );
}
