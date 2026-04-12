/**
 * CICDGenerator — Phase 7
 *
 * Compiles the appropriate Handlebars template for the target CI/CD platform
 * and returns the rendered YAML/Jenkinsfile string.
 *
 * Supported platforms: azure | gitlab | jenkins
 */
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

export type CICDPlatform = 'azure' | 'gitlab' | 'jenkins';

export interface CICDContext {
  sourceFramework: string;
  targetLanguage: string;
  cicdPlatform: CICDPlatform;
  coverage: { linePct: number; branchPct: number };
  generatedAt?: string;
}

export interface CICDResult {
  platform: CICDPlatform;
  /** Output file name to use when writing to ZIP */
  fileName: string;
  yaml: string;
}

// ── Template file map ────────────────────────────────────────────────────────
const TEMPLATE_DIR = path.join(__dirname, 'templates');

const TEMPLATE_MAP: Record<CICDPlatform, string> = {
  azure: path.join(TEMPLATE_DIR, 'azure-pipelines.hbs'),
  gitlab: path.join(TEMPLATE_DIR, 'gitlab-ci.hbs'),
  jenkins: path.join(TEMPLATE_DIR, 'Jenkinsfile.hbs'),
};

const OUTPUT_FILE_MAP: Record<CICDPlatform, string> = {
  azure: 'azure-pipelines.yml',
  gitlab: '.gitlab-ci.yml',
  jenkins: 'Jenkinsfile',
};

// ── Register eq helper (used in templates) ───────────────────────────────────
// Registers once; safe to call multiple times (no-op if already registered)
Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

// ── Public API ────────────────────────────────────────────────────────────────
export class CICDGenerator {
  /**
   * Render the CI/CD pipeline config for the given context.
   * Throws if the template file cannot be read or compiled.
   */
  static generate(ctx: CICDContext): CICDResult {
    const platform = ctx.cicdPlatform;
    const templatePath = TEMPLATE_MAP[platform];

    if (!templatePath) {
      throw new Error(`Unsupported CI/CD platform: "${platform}"`);
    }

    let templateSource: string;
    try {
      templateSource = fs.readFileSync(templatePath, 'utf-8');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Cannot read template for platform "${platform}": ${msg}`);
    }

    const compiled = Handlebars.compile(templateSource, { noEscape: true });

    const coveragePasses =
      ctx.coverage.linePct >= 90 && ctx.coverage.branchPct >= 85;

    const yaml = compiled({
      ...ctx,
      coveragePasses,
      generatedAt: ctx.generatedAt ?? new Date().toISOString(),
    });

    return {
      platform,
      fileName: OUTPUT_FILE_MAP[platform],
      yaml,
    };
  }

  /**
   * Quick sanity check — compiles all three templates to verify they load.
   * Used by GET /health/cicd.
   */
  static healthCheck(): Array<{ platform: CICDPlatform; healthy: boolean; error: string | null }> {
    return (['azure', 'gitlab', 'jenkins'] as CICDPlatform[]).map((platform) => {
      try {
        const templatePath = TEMPLATE_MAP[platform];
        const src = fs.readFileSync(templatePath, 'utf-8');
        Handlebars.compile(src, { noEscape: true }); // throws on parse error
        return { platform, healthy: true, error: null };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { platform, healthy: false, error };
      }
    });
  }
}
