import Anthropic from '@anthropic-ai/sdk';
import { AgentCallParams, AgentResponse } from './AgentTypes';

const MODEL_ID = 'claude-sonnet-4-5';

/**
 * Wraps Claude Sonnet 4.6 for high-accuracy fallback code transformation calls.
 * Cost: 1× — used only when Haiku confidence < 85%.
 */
export class SonnetAgent {
  private readonly client: Anthropic;
  private readonly maxTokens = 8192;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.client = new Anthropic({ apiKey });
  }

  async transform(params: AgentCallParams): Promise<AgentResponse> {
    const { sourceFramework, targetLanguage, detectedPattern, sourceCode } = params;

    const systemPrompt = [
      'You are a senior QA Automation Migration Expert operating in HIGH-ACCURACY mode.',
      'A previous migration attempt produced low confidence. Produce a correct, complete migration.',
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

    const message = await this.client.messages.create({
      model: MODEL_ID,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawOutput = (message.content[0] as { type: string; text: string }).text.trim();

    if (rawOutput.startsWith('CLARIFICATION_NEEDED:')) {
      return {
        migratedCode: '',
        confidence: 0,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
        clarificationNeeded: true,
        clarificationReason: rawOutput.replace('CLARIFICATION_NEEDED:', '').trim(),
      };
    }

    const confidence = computeHeuristicConfidence(sourceCode, rawOutput);

    return {
      migratedCode: rawOutput,
      confidence,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
      clarificationNeeded: false,
      clarificationReason: null,
    };
  }
}

function computeHeuristicConfidence(source: string, migrated: string): number {
  const selectorRe = /\[data-testid|getByRole|getByText|getByLabel|#[\w-]+|\.[\w-]+/g;
  const methodRe = /\b(click|fill|type|hover|check|select|press|goto|waitFor)\b/g;
  const assertRe = /\b(expect|assert|should|toBe|toEqual|toContain|toBeVisible)\b/g;

  const score = (pattern: RegExp) => {
    const srcMatches = new Set((source.match(pattern) ?? []).map((s) => s.toLowerCase()));
    const migMatches = new Set((migrated.match(pattern) ?? []).map((s) => s.toLowerCase()));
    if (srcMatches.size === 0) return 1;
    let hit = 0;
    for (const m of srcMatches) {
      if (migMatches.has(m)) hit++;
    }
    return hit / srcMatches.size;
  };

  const selectorScore = score(selectorRe);
  const methodScore = score(methodRe);
  const assertScore = score(assertRe);
  const patternFidelity = /\btest\b|\bdescribe\b/.test(migrated) ? 1 : 0;

  return (
    selectorScore * 0.4 +
    methodScore * 0.3 +
    assertScore * 0.2 +
    patternFidelity * 0.1
  );
}
