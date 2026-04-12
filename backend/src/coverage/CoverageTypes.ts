/**
 * CoverageTypes — Phase 7
 *
 * Shared types used by all coverage runners and CoverageReporter.
 */

export interface CoverageResult {
  /** Lines executed / total lines (percentage 0-100) */
  linePct: number;
  /** Branches executed / total branches (percentage 0-100) */
  branchPct: number;
  /** How coverage was calculated */
  analysisMethod: 'static' | 'runtime';
  /** Human-readable runner name */
  runner: string;
  /** Extra diagnostics */
  details: CoverageDetail[];
}

export interface CoverageDetail {
  metric: string;
  value: number | string;
  unit?: string;
}
