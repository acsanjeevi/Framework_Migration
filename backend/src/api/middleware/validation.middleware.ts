import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const SOURCE_FRAMEWORKS = [
  'cypress',
  'selenium',
  'robot',
  'webdriverio',
  'testcafe',
  'nightwatch',
] as const;

const TARGET_LANGUAGES = ['typescript', 'javascript', 'java', 'python'] as const;

const CICD_PLATFORMS = ['azure', 'gitlab', 'jenkins'] as const;

export const uploadBodySchema = z.object({
  sourceFramework: z.enum(SOURCE_FRAMEWORKS, {
    message: `Must be one of: ${SOURCE_FRAMEWORKS.join(', ')}`,
  }),
  targetLanguage: z.enum(TARGET_LANGUAGES, {
    message: `Must be one of: ${TARGET_LANGUAGES.join(', ')}`,
  }),
  cicdPlatform: z.enum(CICD_PLATFORMS, {
    message: `Must be one of: ${CICD_PLATFORMS.join(', ')}`,
  }),
});

export type UploadBody = z.infer<typeof uploadBodySchema>;

export function validateUploadBody(req: Request, res: Response, next: NextFunction): void {
  const result = uploadBodySchema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'unknown',
      message: issue.message,
    }));
    res.status(400).json({ status: 'error', message: 'Validation failed', errors });
    return;
  }
  next();
}
