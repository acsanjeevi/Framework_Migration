/**
 * SelectorParser — Phase 6
 *
 * Scans test source code for selector strings produced by common frameworks
 * (Cypress, Playwright, Selenium, WebdriverIO, TestCafe) and returns a list
 * of ParsedSelector objects that carry the raw selector, its semantic type,
 * source position, and a logical name inferred for use by FallbackGenerator.
 */

export type SelectorType =
  | 'css-id'
  | 'css-class'
  | 'css-attr'
  | 'css-tag'
  | 'xpath'
  | 'unknown';

export type SelectorFramework =
  | 'cypress'
  | 'playwright'
  | 'selenium'
  | 'wdio'
  | 'testcafe'
  | 'unknown';

export interface ParsedSelector {
  /** The raw selector string exactly as it appears in the source */
  raw: string;
  /** Semantic classification of the selector */
  type: SelectorType;
  /** 1-based line number in the source */
  line: number;
  /** 1-based column number in the source */
  column: number;
  /** Test framework that produced this call */
  framework: SelectorFramework;
  /** Inferred logical/element name used by FallbackGenerator */
  logical: string;
}

// ── Pattern table ────────────────────────────────────────────────────────────
// Each entry captures the raw selector string in group 2.
const SELECTOR_PATTERNS: Array<{ source: string; flags: string; framework: SelectorFramework }> = [
  // Cypress: cy.get('sel'), cy.find('sel')
  {
    source: String.raw`cy\s*\.\s*(?:get|find)\s*\(\s*(['"\`])([\s\S]*?)\1`,
    flags: 'g',
    framework: 'cypress',
  },
  // Playwright: page.locator('sel') / .locator('sel')
  {
    source: String.raw`\.locator\s*\(\s*(['"\`])([\s\S]*?)\1`,
    flags: 'g',
    framework: 'playwright',
  },
  // Playwright helpers: getByTestId('sel'), getByPlaceholder('sel'), getByLabel('sel'), getByText('sel')
  {
    source: String.raw`\.getBy(?:TestId|Placeholder|Label|Text)\s*\(\s*(['"\`])([\s\S]*?)\1`,
    flags: 'g',
    framework: 'playwright',
  },
  // Selenium: By.css('sel'), By.xpath('sel'), By.id('sel'), By.className('sel'), By.name('sel')
  {
    source: String.raw`By\.\s*(?:css|xpath|id|className|name)\s*\(\s*(['"\`])([\s\S]*?)\1`,
    flags: 'g',
    framework: 'selenium',
  },
  // WebdriverIO: $('sel') or $$('sel')
  {
    source: String.raw`\$\$?\s*\(\s*(['"\`])([\s\S]*?)\1`,
    flags: 'g',
    framework: 'wdio',
  },
  // TestCafe: Selector('sel')
  {
    source: String.raw`\bSelector\s*\(\s*(['"\`])([\s\S]*?)\1`,
    flags: 'g',
    framework: 'testcafe',
  },
];

// ── Selector classification ───────────────────────────────────────────────────
function classifySelector(raw: string): SelectorType {
  const t = raw.trim();
  if (t.startsWith('#')) return 'css-id';
  if (t.startsWith('.')) return 'css-class';
  if (t.startsWith('[')) return 'css-attr';
  if (t.startsWith('//') || t.startsWith('(//')) return 'xpath';
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(t)) return 'css-tag';
  return 'unknown';
}

// ── Logical name inference ────────────────────────────────────────────────────
function inferLogicalName(raw: string, type: SelectorType): string {
  switch (type) {
    case 'css-id':
      return raw.replace(/^#/, '').split(/[\s.:[>+~]/)[0] || 'element';

    case 'css-class':
      return raw.replace(/^\./, '').split(/[\s.:[>+~]/)[0] || 'element';

    case 'css-attr': {
      // e.g. [data-testid="login-btn"] or [data-cy='submit']
      const m = raw.match(/\[[\w-]+\s*=\s*['"]?([\w-]+)['"]?\]/);
      if (m) return m[1];
      // Fall back to stripping non-alnum chars
      return raw.replace(/[[\]'"=\s]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'element';
    }

    case 'css-tag':
      return raw.trim();

    case 'xpath': {
      // //div[@id='foo'] or //*[@data-testid='bar']
      const m = raw.match(/@(?:id|data-testid|data-cy|class)\s*=\s*['"]?([\w-]+)/);
      if (m) return m[1];
      return 'element';
    }

    default:
      return (
        raw
          .replace(/[^a-zA-Z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40) || 'element'
      );
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export class SelectorParser {
  /**
   * Parse all selector calls found in `code`.
   * Deduplicates identical (raw, framework) pairs.
   * Returns selectors ordered by line number ascending.
   */
  static parse(code: string): ParsedSelector[] {
    const results: ParsedSelector[] = [];
    const seen = new Set<string>();

    for (const { source, flags, framework } of SELECTOR_PATTERNS) {
      const re = new RegExp(source, flags);
      let match: RegExpExecArray | null;

      while ((match = re.exec(code)) !== null) {
        const raw = match[2];
        if (!raw || raw.trim().length === 0) continue;

        const key = `${raw}||${framework}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Compute 1-based line/column from match.index
        const before = code.slice(0, match.index);
        const line = before.split('\n').length;
        const lastNewline = before.lastIndexOf('\n');
        const column = match.index - lastNewline;

        const type = classifySelector(raw);
        const logical = inferLogicalName(raw, type);

        results.push({ raw, type, line, column, framework, logical });
      }
    }

    // Sort by line ascending for predictable annotation insertion order
    results.sort((a, b) => a.line - b.line || a.column - b.column);
    return results;
  }
}
