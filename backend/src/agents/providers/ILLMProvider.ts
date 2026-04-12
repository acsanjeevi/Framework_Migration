/** Raw result returned by any LLM provider's callModel method. */
export interface LLMCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Common interface for all LLM provider adapters.
 * New providers (OpenAI, Groq, Mistral, etc.) implement this contract
 * without touching any orchestration code.
 */
export interface ILLMProvider {
  callModel(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<LLMCallResult>;
}
