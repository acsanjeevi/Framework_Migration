import OpenAI from 'openai';
import { ILLMProvider, LLMCallResult } from './ILLMProvider';

/**
 * Calls any OpenAI-compatible API.
 * Works for:
 *   - OpenAI          → default baseURL
 *   - Groq            → baseURL: 'https://api.groq.com/openai/v1'
 *   - Azure OpenAI    → baseURL: 'https://<resource>.openai.azure.com/openai/deployments/<deployment>'
 *   - Any other OpenAI-compatible endpoint
 */
const MAX_RETRIES = 4;

/** Parse retry-after seconds from Groq/OpenAI 429 error messages. */
function parseRetryAfterMs(message: string): number {
  // e.g. "Please try again in 36.62s" or "try again in 4m31.296s"
  const match = message.match(/try again in (?:(\d+)m)?(\d+\.?\d*)s/i);
  if (match) {
    const minutes = match[1] ? parseInt(match[1], 10) * 60 : 0;
    const secs = match[2] ? parseFloat(match[2]) : 0;
    // Add 1.5s buffer, cap at 90s to avoid hanging too long
    return Math.min((minutes + secs + 1.5) * 1000, 90_000);
  }
  return 0;
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.toLowerCase().includes('rate limit');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAICompatProvider implements ILLMProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }

  async callModel(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<LLMCallResult> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        const text = (response.choices[0]?.message?.content ?? '').trim();
        const usage = response.usage;

        return {
          text,
          inputTokens: usage?.prompt_tokens ?? 0,
          outputTokens: usage?.completion_tokens ?? 0,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (isRateLimitError(lastError) && attempt < MAX_RETRIES - 1) {
          const parsedMs = parseRetryAfterMs(lastError.message);
          // Use parsed delay OR exponential backoff (5s, 10s, 20s), whichever is larger
          const backoffMs = Math.pow(2, attempt) * 5_000;
          const delayMs = Math.max(parsedMs, backoffMs);
          console.warn(
            `[llm] Rate limit on attempt ${attempt + 1}/${MAX_RETRIES} for ${model} — ` +
            `retrying in ${Math.round(delayMs / 1000)}s…`
          );
          await sleep(delayMs);
          continue;
        }

        // Non-rate-limit error or exhausted retries — rethrow immediately
        throw lastError;
      }
    }

    throw lastError;
  }
}
