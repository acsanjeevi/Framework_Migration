import type { ProgressEvent, BatchResult, UploadResponse, UploadConfig } from '@/types/api'

// ─────────────────────────────────────────────────────────────────────────────
// Demo file set — realistic Cypress → Playwright TypeScript migration
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_JOB_ID = 'batch_mock_demo_001'

export const MOCK_CONFIG: UploadConfig = {
  sourceFramework: 'cypress',
  targetLanguage: 'typescript',
  cicdPlatform: 'azure',
}

export const MOCK_UPLOAD_RESPONSE: UploadResponse = {
  status: 'accepted',
  jobId: MOCK_JOB_ID,
  fileCount: 3,
  files: [
    { name: 'login.spec.ts',    size: 2048 },
    { name: 'checkout.spec.ts', size: 3512 },
    { name: 'search.spec.ts',   size: 1780 },
  ],
  config: MOCK_CONFIG,
  websocket: `/ws/progress/${MOCK_JOB_ID}`,
  message: 'Migration job queued — subscribe to websocket for real-time progress',
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress event sequence for each demo file
// ─────────────────────────────────────────────────────────────────────────────

function makeProgressSequence(fileName: string, agentUsed: string): ProgressEvent[] {
  return [
    { type: 'PROGRESS', fileName, percentage: 10,  step: 1, stepName: 'Framework Detection',   agentUsed: 'stub' },
    { type: 'PROGRESS', fileName, percentage: 25,  step: 2, stepName: 'Pattern Identification', agentUsed: 'stub' },
    { type: 'PROGRESS', fileName, percentage: 50,  step: 3, stepName: 'Code Transformation',    agentUsed, confidence: 0.91 },
    { type: 'PROGRESS', fileName, percentage: 65,  step: 4, stepName: 'Self-Healing',           agentUsed },
    { type: 'PROGRESS', fileName, percentage: 80,  step: 5, stepName: 'CI/CD Generation',       agentUsed },
    { type: 'PROGRESS', fileName, percentage: 90,  step: 6, stepName: 'Coverage Analysis',      agentUsed,
      coverage: { linePct: 94.2, branchPct: 88.7 } },
    { type: 'COMPLETE', fileName, percentage: 100, step: 7, stepName: 'Final Verification',     agentUsed,
      confidence: 0.93, coverage: { linePct: 94.2, branchPct: 88.7 } },
  ]
}

function makeFailedSequence(fileName: string): ProgressEvent[] {
  return [
    { type: 'PROGRESS', fileName, percentage: 10, step: 1, stepName: 'Framework Detection',   agentUsed: 'stub' },
    { type: 'PROGRESS', fileName, percentage: 25, step: 2, stepName: 'Pattern Identification', agentUsed: 'stub' },
    { type: 'FAILED',   fileName, percentage: 25, step: 3, stepName: 'Code Transformation',    agentUsed: 'stub',
      errorReason: 'Confidence 0.61 below threshold 0.85 — manual review required' },
  ]
}

// login.spec.ts — uses haiku, succeeds
// checkout.spec.ts — escalates to sonnet, succeeds  
// search.spec.ts — fails at step 3 (for demo of error state)
export const MOCK_EVENT_SEQUENCES: ProgressEvent[][] = [
  makeProgressSequence('login.spec.ts',    'claude-haiku-4-5'),
  makeProgressSequence('checkout.spec.ts', 'claude-sonnet-4-5'),
  makeFailedSequence('search.spec.ts'),
]

// Per-file timing: [stepDelayMs] — stagger files so they don't all move at once
export const MOCK_FILE_DELAYS_MS = [0, 800, 1600]
export const MOCK_STEP_INTERVAL_MS = 1200

// ─────────────────────────────────────────────────────────────────────────────
// Mock summary result (returned from GET /api/migrate/summary/:jobId)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_MIGRATED_CODE = `import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // [SELF-HEAL] primary: getByLabel('Email') | fallback: #email, input[name="email"]
    await page.getByLabel('Email').fill('user@example.com');

    // [SELF-HEAL] primary: getByLabel('Password') | fallback: #password, input[type="password"]
    await page.getByLabel('Password').fill('password123');

    // [SELF-HEAL] primary: getByRole('button', { name: 'Sign In' }) | fallback: .btn-login, button[type="submit"]
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('wrongpass');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // [SELF-HEAL] primary: getByText('Invalid credentials') | fallback: .error-message, [data-testid="login-error"]
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });
});`

export const MOCK_CICD_YAML = `trigger:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npx playwright install --with-deps
    displayName: 'Install Playwright browsers'

  - script: npx playwright test
    displayName: 'Run Playwright tests'

  - task: PublishTestResults@2
    condition: succeededOrFailed()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'playwright-report/**/*.xml'
    displayName: 'Publish test results'`

export const MOCK_BATCH_RESULT: BatchResult = {
  batchId: MOCK_JOB_ID,
  completedAt: new Date().toISOString(),
  config: MOCK_CONFIG,
  files: [
    {
      fileName: 'login.spec.ts',
      status: 'complete',
      healedCode: MOCK_MIGRATED_CODE,
      cicdYaml: MOCK_CICD_YAML,
      cicdFileName: 'azure-pipelines.yml',
      coverage: { linePct: 94.2, branchPct: 88.7 },
      confidence: 0.93,
      agentUsed: 'claude-haiku-4-5',
      detectedFramework: 'cypress',
      detectedPattern: 'Page Object Model',
    },
    {
      fileName: 'checkout.spec.ts',
      status: 'complete',
      healedCode: MOCK_MIGRATED_CODE.replace(/Login/g, 'Checkout').replace(/login/g, 'checkout'),
      cicdYaml: MOCK_CICD_YAML,
      cicdFileName: 'azure-pipelines.yml',
      coverage: { linePct: 91.5, branchPct: 86.2 },
      confidence: 0.89,
      agentUsed: 'claude-sonnet-4-5',
      detectedFramework: 'cypress',
      detectedPattern: 'Data-Driven Testing',
    },
    {
      fileName: 'search.spec.ts',
      status: 'failed',
      errorReason: 'Confidence 0.61 below threshold 0.85 — manual review required',
      detectedFramework: 'cypress',
      detectedPattern: 'Unknown',
    },
  ],
}
