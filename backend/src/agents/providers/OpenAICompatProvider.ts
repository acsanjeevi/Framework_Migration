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
  }
}
