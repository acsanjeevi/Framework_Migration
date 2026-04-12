/** Output returned by any LLM agent after a code transformation call. */
export interface AgentResponse {
  /** The migrated Playwright code produced by the model */
  migratedCode: string;
  /**
   * Confidence score 0–1 computed from the coverage formula in the architecture:
   *   (selectors matched / total) × 0.40
   *   (methods matched   / total) × 0.30
   *   (assertions mapped / total) × 0.20
   *   (pattern fidelity check   ) × 0.10
   *
   * Phase 5 uses a heuristic proxy until a dedicated verifier parses the output.
   */
  confidence: number;
  /** Token usage reported by the API */
  usage: { inputTokens: number; outputTokens: number };
  /** Whether the model flagged the source as ambiguous */
  clarificationNeeded: boolean;
  /** Reason returned by the model when clarificationNeeded === true */
  clarificationReason: string | null;
}

export interface AgentCallParams {
  sourceFramework: string;
  targetLanguage: string;
  detectedPattern: string;
  sourceCode: string;
}
