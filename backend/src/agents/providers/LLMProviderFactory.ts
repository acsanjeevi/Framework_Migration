import { ILLMProvider } from './ILLMProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { OpenAICompatProvider } from './OpenAICompatProvider';

/**
 * Supported LLM provider names.
 *
 * Configured via environment variable:
 *   LLM_PROVIDER=anthropic   (default)
 *   LLM_PROVIDER=openai
 *   LLM_PROVIDER=groq
 *
 * Model overrides (optional):
 *   LLM_PRIMARY_MODEL=<model-id>    — overrides the provider default primary model
 *   LLM_FALLBACK_MODEL=<model-id>   — overrides the provider default fallback model
 *
 * API keys:
 *   ANTHROPIC_API_KEY   (for LLM_PROVIDER=anthropic)
 *   OPENAI_API_KEY      (for LLM_PROVIDER=openai)
 *   GROQ_API_KEY        (for LLM_PROVIDER=groq)
 */
export type ProviderName = 'anthropic' | 'openai' | 'groq';

export interface LLMConfig {
  provider: ILLMProvider;
  primaryModel: string;
  fallbackModel: string;
  providerName: ProviderName;
}

const PROVIDER_DEFAULTS: Record<ProviderName, { primary: string; fallback: string }> = {
  anthropic: {
    primary: 'claude-haiku-4-5',
    fallback: 'claude-sonnet-4-5',
  },
  openai: {
    primary: 'gpt-4o-mini',
    fallback: 'gpt-4o',
  },
  groq: {
    primary: 'llama-3.3-70b-versatile',
    fallback: 'llama-3.3-70b-versatile',
  },
};

/**
 * Reads environment variables and returns a fully configured LLMConfig.
 * Called once at AgentRouter construction time.
 */
export function createLLMConfig(): LLMConfig {
  const raw = (process.env.LLM_PROVIDER ?? 'anthropic').toLowerCase();
  const providerName: ProviderName =
    raw === 'openai' ? 'openai' : raw === 'groq' ? 'groq' : 'anthropic';

  const defaults = PROVIDER_DEFAULTS[providerName];
  const primaryModel = process.env.LLM_PRIMARY_MODEL ?? defaults.primary;
  const fallbackModel = process.env.LLM_FALLBACK_MODEL ?? defaults.fallback;

  let provider: ILLMProvider;

  switch (providerName) {
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY ?? '';
      if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set');
      provider = new OpenAICompatProvider(apiKey);
      break;
    }
    case 'groq': {
      const apiKey = process.env.GROQ_API_KEY ?? '';
      if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not set');
      provider = new OpenAICompatProvider(apiKey, 'https://api.groq.com/openai/v1');
      break;
    }
    default: {
      const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      provider = new AnthropicProvider(apiKey);
    }
  }

  console.log(
    `[llm-factory] Provider: ${providerName} | Primary: ${primaryModel} | Fallback: ${fallbackModel}`
  );

  return { provider, primaryModel, fallbackModel, providerName };
}

/**
 * Creates an LLMConfig from explicit per-request values (frontend Settings dialog).
 * Accepts the same provider/key/model fields that the frontend sends in the upload form.
 * API key is NEVER logged.
 */
export function createLLMConfigFromOverride(override: {
  provider: string;
  apiKey: string;
  primaryModel: string;
  fallbackModel: string;
}): LLMConfig {
  const providerName: ProviderName =
    override.provider === 'openai' ? 'openai'
    : override.provider === 'groq' ? 'groq'
    : 'anthropic';

  if (!override.apiKey) {
    throw new Error(`API key required for provider '${providerName}'`);
  }

  const defaults = PROVIDER_DEFAULTS[providerName];
  const primaryModel = override.primaryModel || defaults.primary;
  const fallbackModel = override.fallbackModel || defaults.fallback;

  let provider: ILLMProvider;
  switch (providerName) {
    case 'openai':
      provider = new OpenAICompatProvider(override.apiKey);
      break;
    case 'groq':
      provider = new OpenAICompatProvider(override.apiKey, 'https://api.groq.com/openai/v1');
      break;
    default:
      provider = new AnthropicProvider(override.apiKey);
  }

  console.log(`[llm-factory] Override — Provider: ${providerName} | Primary: ${primaryModel} | Fallback: ${fallbackModel}`);

  return { provider, primaryModel, fallbackModel, providerName };
}
