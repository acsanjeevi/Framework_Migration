import Anthropic from '@anthropic-ai/sdk';
import { ILLMProvider, LLMCallResult } from './ILLMProvider';

/** Calls Anthropic Claude models via `@anthropic-ai/sdk`. */
export class AnthropicProvider implements ILLMProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async callModel(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<LLMCallResult> {
    const message = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();

    return {
      text,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
  }
}
