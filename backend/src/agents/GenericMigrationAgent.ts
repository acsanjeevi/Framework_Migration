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
          '- Do NOT add any inline comments or annotations inside selector strings.',
          '- Preserve 100% of original test intent and assertions.',
          '- Return ONLY valid code — no markdown fences, no explanations.',
        ].join('\n')
      : [
          'You are a QA Automation Migration Expert. Your ONLY task is to convert the provided source test code to Playwright.',
          'Rules:',
          '- ONLY use selectors, class names and method names from the source file.',
          '- NEVER invent or assume anything not present in the source.',
          '- If source is ambiguous, respond with exactly: CLARIFICATION_NEEDED: <reason>',
          '- Do NOT add any inline comments or annotations inside selector strings.',
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

    // Strip markdown code fences that some LLMs add despite prompt instructions
    const cleanedCode = result.text
      .replace(/^```[\w]*\r?\n?/m, '')   // opening fence: ```typescript or ```
      .replace(/\r?\n?```\s*$/m, '')      // closing fence: ```
      .trim();

    const confidence = computeHeuristicConfidence(sourceCode, cleanedCode);

    return {
      migratedCode: cleanedCode,
      confidence,
      usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens },
      clarificationNeeded: false,
      clarificationReason: null,
    };
  }
}

/**
 * Heuristic confidence proxy (pre-Phase 7 verifier).
 *
 * Framework-aware scoring that understands Cypress → Playwright API renames.
 * Formula: selectors×0.35 + methods×0.30 + assertions×0.25 + structure×0.10
 */
function computeHeuristicConfidence(source: string, migrated: string): number {
  // ── API equivalence maps: Cypress → Playwright ───────────────────────────
  // Normalise source tokens to their Playwright equivalents before comparison
  const METHOD_MAP: Record<string, string> = {
    visit: 'goto',
    type: 'fill',
    'sendkeys': 'fill',
    'contains': 'getbytext',
    'should': '__ASSERTION__',
    'within': 'locator',
    'invoke': 'evaluate',
    'its': 'evaluate',
    'wrap': 'evaluate',
    'trigger': 'dispatchevent',
  };

  const ASSERT_MAP: Record<string, string> = {
    should: 'expect',
    assert: 'expect',
    'tobe': 'tobe',
    'toequal': 'toequal',
    'tocontain': 'tocontain',
    'include': 'tocontain',
    'bevisible': 'tobevisible',
    'havecss': 'tohavecss',
    'haveurl': 'tohaveurl',
  };

  // Normalise: map [data-cy=X] ↔ [data-testid=X] ↔ getByTestId
  const normaliseSelectors = (s: string) =>
    s.replace(/\[data-cy=[^\]]+\]/gi, '__DATA_ATTR__')
     .replace(/\[data-testid=[^\]]+\]/gi, '__DATA_ATTR__')
     .replace(/getByTestId\([^)]+\)/gi, '__DATA_ATTR__')
     .replace(/cy\.get\([^)]+\)/gi, '__LOCATOR__')
     .replace(/page\.locator\([^)]+\)/gi, '__LOCATOR__');

  const srcN = normaliseSelectors(source);
  const migN = normaliseSelectors(migrated);

  // Selector score: normalised selector tokens
  const selectorRe = /__DATA_ATTR__|__LOCATOR__|getByRole|getByText|getByLabel|getByPlaceholder|#[\w-]+/g;
  const selSrcTokens = new Set((srcN.match(selectorRe) ?? []).map(s => s.toLowerCase()));
  const selMigTokens = new Set((migN.match(selectorRe) ?? []).map(s => s.toLowerCase()));
  const selectorScore = selSrcTokens.size === 0 ? 1 :
    (() => {
      let hit = 0;
      for (const t of selSrcTokens) if (selMigTokens.has(t)) hit++;
      return Math.max(hit / selSrcTokens.size, selMigTokens.size > 0 ? 0.5 : 0);
    })();

  // Method score: normalise Cypress methods to Playwright equivalents first
  const methodRe = /\b(click|fill|type|hover|check|select|press|goto|visit|navigate|waitFor|locator|dblclick|focus|blur|clear|submit)\b/gi;
  const srcMethods = (source.match(methodRe) ?? []).map(m => {
    const lm = m.toLowerCase();
    return METHOD_MAP[lm] ?? lm;
  });
  const migMethods = (migrated.match(methodRe) ?? []).map(m => m.toLowerCase());
  const srcMethodSet = new Set(srcMethods);
  const migMethodSet = new Set(migMethods);
  const methodScore = srcMethodSet.size === 0 ? 1 :
    (() => {
      let hit = 0;
      for (const t of srcMethodSet) if (migMethodSet.has(t)) hit++;
      return Math.max(hit / srcMethodSet.size, migMethodSet.size > 0 ? 0.5 : 0);
    })();

  // Assertion score: normalise Cypress assertions to Playwright equivalents
  const assertRe = /\b(expect|assert|should|toBe|toEqual|toContain|toBeVisible|toHaveURL|toHaveText|include|contain)\b/gi;
  const srcAsserts = (source.match(assertRe) ?? []).map(a => {
    const la = a.toLowerCase();
    return ASSERT_MAP[la] ?? la;
  });
  const migAsserts = (migrated.match(assertRe) ?? []).map(a => a.toLowerCase());
  const srcAssertSet = new Set(srcAsserts);
  const migAssertSet = new Set(migAsserts);
  const assertScore = srcAssertSet.size === 0 ? 1 :
    (() => {
      let hit = 0;
      for (const t of srcAssertSet) if (migAssertSet.has(t)) hit++;
      return Math.max(hit / srcAssertSet.size, migAssertSet.size > 0 ? 0.5 : 0);
    })();

  // Structure: migrated has Playwright structural markers
  const hasPlaywrightStructure =
    /\btest\b|\bdescribe\b/.test(migrated) ||
    /\bpage\b/.test(migrated) ||
    /import.*@playwright/.test(migrated) ||
    /async.*\{.*page.*\}/.test(migrated);

  const confidence =
    selectorScore * 0.35 +
    methodScore   * 0.30 +
    assertScore   * 0.25 +
    (hasPlaywrightStructure ? 1 : 0) * 0.10;

  return Math.min(1, Math.max(0, confidence));
}
