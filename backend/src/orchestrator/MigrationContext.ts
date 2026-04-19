/** All input data available to every orchestration step. */
export interface MigrationContext {
  /** Unique job identifier (from Bull queue or upload session) */
  jobId: string;
  /** Name of the file being migrated */
  fileName: string;
  /** Raw source code string */
  sourceCode: string;
  /** Framework supplied by the user on upload */
  declaredSourceFramework: string;
  /** Language to migrate to */
  targetLanguage: 'typescript' | 'javascript' | 'java' | 'python';
  /** CI/CD platform to generate config for */
  cicdPlatform: 'azure' | 'gitlab' | 'jenkins';

  // ── Populated by steps as the pipeline progresses ──────────────────────────
  /** Set by Step 1 */
  detectedFramework?: string;
  /** Set by Step 2 */
  detectedPattern?: string;
  /** Set by Step 3 — the migrated Playwright code */
  migratedCode?: string;
  /** Set by Step 3 — overall LLM confidence score (0–1) */
  confidence?: number;
  /** Set by Step 3 — model ID that produced the final output (e.g. 'claude-haiku-4-5', 'gpt-4o-mini') */
  agentUsed?: string;
  /** Set by Step 4 — annotated code with [SELF-HEAL] comments */
  healedCode?: string;
  /** Set by Step 5 — generated CI/CD YAML string */
  cicdYaml?: string;
  /** Set by Step 6 — coverage results */
  coverage?: { linePct: number; branchPct: number };
  /** Set by Step 7 — final verification passed */
  verified?: boolean;

  /**
   * Optional LLM configuration supplied per-request (from the frontend Settings dialog).
   * If present, overrides LLM_PROVIDER / *_API_KEY environment variables for this job.
   * The apiKey is NEVER logged.
   */
  llmConfig?: {
    provider: 'anthropic' | 'openai' | 'groq';
    apiKey: string;
    primaryModel: string;
    fallbackModel: string;
  };

  /**
   * Per-job logger — set by the orchestrator, available to all steps.
   * Steps can log step-specific events without creating their own logger instances.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _logger?: any;
}
