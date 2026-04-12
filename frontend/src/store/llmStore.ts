import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LLMProvider = 'anthropic' | 'openai' | 'groq'

interface LLMState {
  provider: LLMProvider
  apiKey: string
  primaryModel: string
  fallbackModel: string
  setProvider: (p: LLMProvider) => void
  setApiKey: (k: string) => void
  setPrimaryModel: (m: string) => void
  setFallbackModel: (m: string) => void
}

const PROVIDER_DEFAULTS: Record<LLMProvider, { primary: string; fallback: string }> = {
  anthropic: { primary: 'claude-haiku-4-5', fallback: 'claude-sonnet-4-5' },
  openai:    { primary: 'gpt-4o-mini',       fallback: 'gpt-4o' },
  groq:      { primary: 'llama-3.1-8b-instant', fallback: 'llama-3.1-70b-versatile' },
}

export const useLLMStore = create<LLMState>()(
  persist(
    (set, get) => ({
      provider:     'anthropic',
      apiKey:       '',
      primaryModel: PROVIDER_DEFAULTS.anthropic.primary,
      fallbackModel: PROVIDER_DEFAULTS.anthropic.fallback,

      setProvider(p) {
        const defaults = PROVIDER_DEFAULTS[p]
        // Reset models to provider defaults when switching
        set({
          provider: p,
          primaryModel: defaults.primary,
          fallbackModel: defaults.fallback,
          // Clear key when switching providers
          apiKey: get().provider !== p ? '' : get().apiKey,
        })
      },
      setApiKey:       (k) => set({ apiKey: k }),
      setPrimaryModel: (m) => set({ primaryModel: m }),
      setFallbackModel:(m) => set({ fallbackModel: m }),
    }),
    {
      name: 'llm-settings',
      // Never persist the API key to localStorage for security
      partialize: (state) => ({
        provider: state.provider,
        primaryModel: state.primaryModel,
        fallbackModel: state.fallbackModel,
      }),
    }
  )
)
