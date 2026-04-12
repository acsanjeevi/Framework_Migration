/**
 * AnnotationWriter — Phase 6
 *
 * Takes the migrated source code and a list of FallbackChain objects, then
 * inserts a structured `// [SELF-HEAL]` comment block above each line that
 * contains an annotated selector.  Insertion is done in reverse-line order
 * so that earlier line numbers are not invalidated by inserted lines.
 */

import { FallbackChain } from './FallbackGenerator';

export interface AnnotationResult {
  /** Annotated source code with [SELF-HEAL] comment blocks inserted */
  annotatedCode: string;
  /** Number of selector sites annotated */
  selectorsAnnotated: number;
  /** Number of unique lines that received annotations */
  linesAnnotated: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildCommentBlock(chain: FallbackChain, indent: string): string[] {
  const { original, fallbacks } = chain;
  const lines: string[] = [
    `${indent}// [SELF-HEAL] selector: ${original.raw}`,
    `${indent}//   type: ${original.type}  |  framework: ${original.framework}  |  logical-name: ${original.logical}`,
  ];
  for (const fb of fallbacks) {
    lines.push(
      `${indent}//   L${fb.level} [${fb.strategy.padEnd(14)}] ${fb.selector.padEnd(50)} — ${fb.description}`
    );
  }
  return lines;
}

/** Extract leading whitespace from a line of code */
function getIndent(line: string): string {
  const m = line.match(/^(\s*)/);
  return m ? m[1] : '';
}

// ── Public API ────────────────────────────────────────────────────────────────
export class AnnotationWriter {
  /**
   * Annotate `code` by inserting `// [SELF-HEAL]` comment blocks above every
   * line that contains a selector referenced in `chains`.
   */
  static annotate(code: string, chains: FallbackChain[]): AnnotationResult {
    if (chains.length === 0) {
      return { annotatedCode: code, selectorsAnnotated: 0, linesAnnotated: 0 };
    }

    const lines = code.split('\n');

    // Group chains by 1-based line number (multiple selectors can share a line)
    const byLine = new Map<number, FallbackChain[]>();
    for (const chain of chains) {
      const ln = chain.original.line;
      if (!byLine.has(ln)) byLine.set(ln, []);
      byLine.get(ln)!.push(chain);
    }

    // Process lines in descending order so earlier indices stay valid
    const sortedLineNums = [...byLine.keys()].sort((a, b) => b - a);

    for (const lineNum of sortedLineNums) {
      const lineChains = byLine.get(lineNum)!;
      const zeroIdx = lineNum - 1; // 0-based index into `lines`

      // Use the indent of the target line for the comment block
      const targetLine = lines[zeroIdx] ?? '';
      const indent = getIndent(targetLine);

      const commentLines: string[] = [];
      for (const chain of lineChains) {
        // Separate consecutive selectors on the same line with a blank comment
        if (commentLines.length > 0) commentLines.push(`${indent}//`);
        commentLines.push(...buildCommentBlock(chain, indent));
      }

      // Insert comment block immediately above the target line
      lines.splice(zeroIdx, 0, ...commentLines);
    }

    return {
      annotatedCode: lines.join('\n'),
      selectorsAnnotated: chains.length,
      linesAnnotated: byLine.size,
    };
  }
}
