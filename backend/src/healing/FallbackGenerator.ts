/**
 * FallbackGenerator — Phase 6
 *
 * Given a ParsedSelector, produces a 6-level fallback chain ordered from
 * most resilient (data-attribute) to least resilient (XPath).
 *
 * Fallback levels:
 *  1 — data-testid attribute          (most resilient)
 *  2 — ARIA role + accessible name    (layout-change resistant)
 *  3 — Element ID                     (stable if unique)
 *  4 — CSS class                      (fragile to style refactors)
 *  5 — Visible text content           (brittle to copy changes)
 *  6 — XPath                          (last resort)
 */

import { ParsedSelector } from './SelectorParser';

export type FallbackStrategy =
  | 'data-attribute'
  | 'aria-role'
  | 'id'
  | 'css-class'
  | 'text-content'
  | 'xpath';

export interface Fallback {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  strategy: FallbackStrategy;
  description: string;
  selector: string;
}

export interface FallbackChain {
  original: ParsedSelector;
  fallbacks: Fallback[];
}

// ── Role inference ────────────────────────────────────────────────────────────
const ROLE_KEYWORDS: Array<[string, string]> = [
  ['button', 'button'],
  ['btn', 'button'],
  ['submit', 'button'],
  ['link', 'link'],
  ['nav', 'navigation'],
  ['menu', 'menu'],
  ['input', 'textbox'],
  ['field', 'textbox'],
  ['text', 'textbox'],
  ['search', 'searchbox'],
  ['check', 'checkbox'],
  ['radio', 'radio'],
  ['select', 'combobox'],
  ['dropdown', 'combobox'],
  ['combo', 'combobox'],
  ['list', 'list'],
  ['item', 'listitem'],
  ['header', 'heading'],
  ['heading', 'heading'],
  ['title', 'heading'],
  ['img', 'img'],
  ['image', 'img'],
  ['icon', 'img'],
  ['alert', 'alert'],
  ['dialog', 'dialog'],
  ['modal', 'dialog'],
  ['tab', 'tab'],
  ['panel', 'tabpanel'],
  ['form', 'form'],
  ['table', 'table'],
  ['row', 'row'],
  ['cell', 'cell'],
  ['progress', 'progressbar'],
  ['slider', 'slider'],
  ['spinner', 'spinbutton'],
];

function inferRole(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, role] of ROLE_KEYWORDS) {
    if (lower.includes(keyword)) return role;
  }
  return 'button'; // safe default
}

function toHumanName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
}

// ── Public API ────────────────────────────────────────────────────────────────
export class FallbackGenerator {
  /**
   * Generate a full 6-level fallback chain for the given parsed selector.
   */
  static generate(sel: ParsedSelector): FallbackChain {
    const name = sel.logical;
    const humanName = toHumanName(name);
    const role = inferRole(name);

    const fallbacks: Fallback[] = [
      {
        level: 1,
        strategy: 'data-attribute',
        description: 'Preferred — data-testid attribute (most resilient to DOM/style changes)',
        selector: `[data-testid="${name}"]`,
      },
      {
        level: 2,
        strategy: 'aria-role',
        description: 'ARIA role + accessible name (layout-change resistant)',
        selector: `role=${role}[name="${humanName}"]`,
      },
      {
        level: 3,
        strategy: 'id',
        description: 'Element ID (stable when IDs are unique and stable)',
        selector: `#${name}`,
      },
      {
        level: 4,
        strategy: 'css-class',
        description: 'CSS class (fragile to style/refactor changes)',
        selector: `.${name}`,
      },
      {
        level: 5,
        strategy: 'text-content',
        description: 'Visible text content (brittle to copy/i18n changes)',
        selector: `text=${humanName}`,
      },
      {
        level: 6,
        strategy: 'xpath',
        description: 'XPath fallback — last resort',
        selector: `//*[@data-testid='${name}']`,
      },
    ];

    return { original: sel, fallbacks };
  }

  /**
   * Convenience: generate chains for a list of parsed selectors.
   */
  static generateAll(selectors: ParsedSelector[]): FallbackChain[] {
    return selectors.map((s) => FallbackGenerator.generate(s));
  }
}
