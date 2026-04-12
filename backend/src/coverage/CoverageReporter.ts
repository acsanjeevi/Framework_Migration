/**
 * CoverageReporter — Phase 7
 *
 * Routes to the correct static runner based on target language and
 * returns a normalised CoverageResult.
 */

import { CoverageResult } from './CoverageTypes';
import { IstanbulRunner } from './IstanbulRunner';
import { JaCoCoRunner } from './JaCoCoRunner';
import { CoveragePyRunner } from './CoveragePyRunner';

export type TargetLanguage = 'typescript' | 'javascript' | 'java' | 'python';

export class CoverageReporter {
  /**
   * Run the appropriate static analyser for `language` against `code`.
   * Returns a normalised CoverageResult with linePct + branchPct.
   */
  static analyse(code: string, language: TargetLanguage): CoverageResult {
    switch (language) {
      case 'java':
        return JaCoCoRunner.analyse(code);
      case 'python':
        return CoveragePyRunner.analyse(code);
      case 'typescript':
      case 'javascript':
      default:
        return IstanbulRunner.analyse(code);
    }
  }

  /**
   * Smoke-test all three runners with a minimal fixture snippet.
   * Used by GET /health/coverage.
   */
  static healthCheck(): Array<{
    runner: string;
    language: TargetLanguage;
    healthy: boolean;
    sampleLinePct: number;
    sampleBranchPct: number;
    error: string | null;
  }> {
    const fixtures: Array<{ language: TargetLanguage; snippet: string }> = [
      {
        language: 'typescript',
        snippet: `
          test('login', async ({ page }) => {
            await page.goto('/login');
            await page.locator('[data-testid="username"]').fill('user');
            await page.locator('[data-testid="password"]').fill('pass');
            await page.locator('[data-testid="submit-btn"]').click();
            await expect(page.locator('.dashboard')).toBeVisible();
          });
        `,
      },
      {
        language: 'java',
        snippet: `
          @Test
          public void testLogin() {
            driver.findElement(By.id("username")).sendKeys("user");
            driver.findElement(By.id("password")).sendKeys("pass");
            driver.findElement(By.id("submit")).click();
            assertEquals("Dashboard", driver.getTitle());
          }
        `,
      },
      {
        language: 'python',
        snippet: `
          def test_login(driver):
            driver.find_element(By.ID, "username").send_keys("user")
            driver.find_element(By.ID, "password").send_keys("pass")
            driver.find_element(By.ID, "submit").click()
            assert "Dashboard" in driver.title
        `,
      },
    ];

    return fixtures.map(({ language, snippet }) => {
      try {
        const result = CoverageReporter.analyse(snippet, language);
        return {
          runner: result.runner,
          language,
          healthy: true,
          sampleLinePct: result.linePct,
          sampleBranchPct: result.branchPct,
          error: null,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return {
          runner: `${language}-runner`,
          language,
          healthy: false,
          sampleLinePct: 0,
          sampleBranchPct: 0,
          error,
        };
      }
    });
  }
}
