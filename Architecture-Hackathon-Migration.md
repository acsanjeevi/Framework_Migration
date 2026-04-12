# Architecture Document — Hackathon: Migration Agentic Tool
**Phase 1 — AI-Powered Automation Framework Migration with Self-Healing Support**
**Date:** April 11, 2026
**Version:** 1.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [AI Agent Pipeline](#5-ai-agent-pipeline)
6. [Self-Healing Engine](#6-self-healing-engine)
7. [Migration Workflow — Step-by-Step](#7-migration-workflow--step-by-step)
8. [CI/CD Integration Layer](#8-cicd-integration-layer)
9. [Code Coverage Integration](#9-code-coverage-integration)
10. [Real-Time Progress Tracking](#10-real-time-progress-tracking)
11. [Data Flow Diagram](#11-data-flow-diagram)
12. [Technology Stack Summary](#12-technology-stack-summary)
13. [Security Considerations](#13-security-considerations)
14. [Deployment Architecture](#14-deployment-architecture)

---

## 1. System Overview

The **Hackathon Migration Agentic Tool** is a single-page AI-powered web application that allows QA teams to upload legacy test automation scripts and receive fully migrated Playwright test suites with:

- **Self-healing selector annotations**
- **CI/CD pipeline configuration** (Azure DevOps / GitLab CI / Jenkins)
- **Code coverage enforcement** (minimum 90% line / 85% branch)
- **Real-time per-file progress tracking** via React UI
- **Zero-hallucination AI migration** using Claude Haiku 4.5 (base) and Claude Sonnet 4.6 (fallback)

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER (React.js SPA)                      │
│                                                                         │
│  ┌────────────────────┐   ┌─────────────────────┐   ┌───────────────┐  │
│  │  Source Selection  │   │  Progress Dashboard  │   │ Output Viewer │  │
│  │  (Framework/Lang)  │   │  (% per file, color) │   │ (Download/    │  │
│  │  CI/CD Selection   │   │  Amber | Green | Red │   │  Commit)      │  │
│  └────────┬───────────┘   └──────────────────────┘   └───────────────┘  │
└───────────┼─────────────────────────────────────────────────────────────┘
            │ HTTPS REST API + WebSocket (real-time progress)
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   BACKEND SERVER (Vite + TypeScript)                    │
│                                                                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │   API Gateway   │  │  WebSocket Server │  │   File Processor      │  │
│  │  (REST Routes)  │  │  (Progress Push)  │  │   (Upload/Parse)      │  │
│  └────────┬────────┘  └──────────────────┘  └──────────┬────────────┘  │
│           │                                             │               │
│           ▼                                             ▼               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ORCHESTRATION LAYER                           │  │
│  │                                                                  │  │
│  │  Step 1: Framework Detector    Step 2: Pattern Identifier        │  │
│  │  Step 3: Migration Agent       Step 4: Self-Healing Engine       │  │
│  │  Step 5: CI/CD Generator       Step 6: Coverage Analyzer        │  │
│  │  Step 7: Verifier & Scorer                                       │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
            ┌─────────────────────┼──────────────────────┐
            ▼                     ▼                       ▼
┌─────────────────┐   ┌──────────────────────┐  ┌───────────────────────┐
│ Claude Haiku 4.5│   │  Claude Sonnet 4.6   │  │   Code Coverage       │
│ (Base LLM 0.33x)│──▶│  (Fallback LLM 1x)  │  │   Engine              │
│ Confidence < 85%│   │  High-accuracy mode  │  │  Istanbul / JaCoCo /  │
│ triggers fallbck│   │                      │  │  Coverage.py          │
└─────────────────┘   └──────────────────────┘  └───────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          CI/CD OUTPUT LAYER                             │
│   ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│   │  Azure DevOps    │  │   GitLab CI/CD   │  │     Jenkins       │   │
│   │  azure-          │  │  .gitlab-ci.yml  │  │   Jenkinsfile     │   │
│   │  pipelines.yml   │  │                  │  │   (Declarative)   │   │
│   └──────────────────┘  └──────────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Architecture

### 3.1 Technology

| Layer | Technology |
|---|---|
| Runtime | Node.js 20.x |
| UI Framework | React.js 18 |
| Language | TypeScript |
| State Management | Zustand (lightweight global state) |
| HTTP Client | Axios |
| Real-time | WebSocket (native browser API) |
| Styling | Tailwind CSS |
| Component Library | shadcn/ui |
| Build Tool | Vite |

### 3.2 Component Tree

```
App
├── Layout
│   ├── Header (Tool name, version, theme toggle)
│   └── Sidebar (Navigation: Upload | Progress | Output | Settings)
│
├── UploadPage
│   ├── FrameworkSelector        ← Dropdown: Source framework
│   ├── TargetLanguageSelector   ← Dropdown: Playwright target language
│   ├── CICDSelector             ← Radio: Azure DevOps | GitLab | Jenkins
│   ├── FileUploadZone           ← Drag-and-drop multi-file upload
│   └── MigrateButton            ← Triggers migration API call
│
├── ProgressDashboard
│   ├── GlobalProgressBar        ← Overall batch % complete
│   └── FileProgressList
│       └── FileProgressItem[]   ← Per-file:
│           ├── FileName
│           ├── StepLabel        ← Current step (1-7) description
│           ├── ProgressBar      ← 0–100% animated bar
│           └── StatusBadge      ← Amber (In Progress) | Green (Done) | Red (Failed)
│
├── OutputViewer
│   ├── FileTabs                 ← Tab per migrated file
│   ├── CodePreview              ← Syntax-highlighted migrated code
│   ├── SelfHealAnnotations      ← Highlighted [SELF-HEAL] comments panel
│   ├── CICDPreview              ← Generated pipeline file preview
│   ├── CoverageReport           ← Line % + Branch % per file
│   └── DownloadButton           ← Download ZIP of all outputs
│
└── SummaryPage
    └── MigrationSummaryTable    ← Consolidated table: all files, scores, coverage
```

### 3.3 Real-Time Progress State (Zustand Store)

```typescript
interface FileProgress {
  fileName:        string;
  status:          'queued' | 'in-progress' | 'complete' | 'failed';
  percentage:      number;          // 0–100
  currentStep:     number;          // 1–7
  currentStepName: string;
  confidenceScore: number | null;
  lineCoverage:    number | null;
  branchCoverage:  number | null;
  errorReason:     string | null;
  agentUsed:       'haiku-4.5' | 'sonnet-4.6';
}

interface MigrationStore {
  files: FileProgress[];
  updateFileProgress: (fileName: string, update: Partial<FileProgress>) => void;
}
```

### 3.4 WebSocket Event Contract (Frontend ↔ Backend)

```typescript
// Message received from backend over WebSocket
interface ProgressEvent {
  type:         'PROGRESS' | 'COMPLETE' | 'FAILED';
  fileName:     string;
  percentage:   number;
  step:         number;
  stepName:     string;
  agentUsed:    'haiku-4.5' | 'sonnet-4.6';
  confidence?:  number;
  coverage?:    { line: number; branch: number };
  errorReason?: string;
}
```

---

## 4. Backend Architecture

### 4.1 Technology

| Layer | Technology |
|---|---|
| Framework | Vite (dev server) + Node.js HTTP server (production) |
| Language | TypeScript (strict mode) |
| API Style | REST (upload, trigger, download) + WebSocket (progress events) |
| File Handling | Multer (multipart upload) |
| LLM Client | Anthropic SDK (Claude Haiku 4.5 + Sonnet 4.6) |
| Queue | Bull (Redis-backed job queue for file processing) |
| Coverage Engine | nyc (Istanbul) / node-java-coverage / pythoncoverage |
| Template Engine | Handlebars (CI/CD YAML generation) |

### 4.2 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/migrate/upload` | Upload source files + config (source, target, CI/CD platform) |
| `GET` | `/api/migrate/status/:jobId` | Poll overall job status |
| `GET` | `/api/migrate/result/:jobId` | Download migration results ZIP |
| `GET` | `/api/migrate/summary/:jobId` | Get JSON migration summary |
| `WS` | `/ws/progress/:jobId` | WebSocket — real-time per-file progress events |

### 4.3 Backend Module Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── migrate.routes.ts        ← REST route definitions
│   │   │   └── health.routes.ts
│   │   └── middleware/
│   │       ├── upload.middleware.ts     ← Multer config
│   │       └── validation.middleware.ts ← Input validation (Zod)
│   │
│   ├── orchestrator/
│   │   ├── MigrationOrchestrator.ts     ← Coordinates all 7 steps
│   │   ├── steps/
│   │   │   ├── Step1_FrameworkDetector.ts
│   │   │   ├── Step2_PatternIdentifier.ts
│   │   │   ├── Step3_CodeTransformer.ts    ← LLM call (Haiku / Sonnet)
│   │   │   ├── Step4_SelfHealingEngine.ts
│   │   │   ├── Step5_CICDGenerator.ts
│   │   │   ├── Step6_CoverageAnalyzer.ts
│   │   │   └── Step7_Verifier.ts
│   │   └── StepResult.ts                ← Typed result + confidence score
│   │
│   ├── agents/
│   │   ├── HaikuAgent.ts                ← Claude Haiku 4.5 LLM wrapper
│   │   ├── SonnetAgent.ts               ← Claude Sonnet 4.6 LLM wrapper
│   │   └── AgentRouter.ts               ← Routes to Haiku; falls back to Sonnet
│   │
│   ├── selfhealing/
│   │   ├── SelectorParser.ts            ← Extracts all selectors from source
│   │   ├── FallbackGenerator.ts         ← Generates fallback selector strategies
│   │   └── AnnotationWriter.ts          ← Writes [SELF-HEAL] inline comments
│   │
│   ├── cicd/
│   │   ├── templates/
│   │   │   ├── azure-pipelines.hbs      ← Handlebars template
│   │   │   ├── gitlab-ci.hbs
│   │   │   └── jenkinsfile.hbs
│   │   └── CICDGenerator.ts             ← Compiles template with migration context
│   │
│   ├── coverage/
│   │   ├── IstanbulRunner.ts            ← JS/TS coverage (nyc)
│   │   ├── JaCoCoRunner.ts              ← Java coverage
│   │   ├── CoveragePyRunner.ts          ← Python coverage
│   │   └── CoverageReporter.ts          ← Unified coverage report formatter
│   │
│   ├── websocket/
│   │   └── ProgressEmitter.ts           ← Pushes ProgressEvent to connected client
│   │
│   └── queue/
│       └── MigrationQueue.ts            ← Bull queue — one job per uploaded batch
│
├── vite.config.ts
└── tsconfig.json
```

---

## 5. AI Agent Pipeline

### 5.1 Agent Selection Logic

```
Incoming file
      │
      ▼
Claude Haiku 4.5 (Base)
      │
      ├─ Confidence >= 85% ──▶ Use Haiku output → Proceed to Step 4
      │
      └─ Confidence < 85%  ──▶ Escalate to Claude Sonnet 4.6 (Fallback)
                                      │
                                      ├─ Confidence >= 85% ──▶ Use Sonnet output
                                      │
                                      └─ Confidence < 85%  ──▶ HALT
                                                                Flag for Human Review
                                                                Do NOT auto-commit
```

### 5.2 LLM Prompt Structure (Code Transformation — Step 3)

```
System Prompt:
  You are a QA Automation Migration Expert. Your ONLY task is to convert
  the provided source test code to Playwright {targetLanguage}. 
  Rules:
  - ONLY use selectors, class names and method names from the source file.
  - NEVER invent or assume anything not present in the source.
  - If source is ambiguous, respond with: CLARIFICATION_NEEDED: <reason>
  - Annotate every selector with [SELF-HEAL] primary + fallback options.
  - Preserve 100% of original test intent and assertions.

User Prompt:
  Source Framework : {sourceFramework}
  Target Language  : {targetLanguage}
  Pattern Detected : {pattern}
  Source File      : {sourceCode}

  Convert the above to Playwright {targetLanguage}. Return ONLY valid code.
```

### 5.3 Confidence Scoring Formula

```
Confidence Score = 
  (Selectors Matched / Total Selectors) × 0.40   +
  (Methods Matched   / Total Methods  ) × 0.30   +
  (Assertions Mapped / Total Assertions) × 0.20  +
  (Pattern Fidelity Check passed       ) × 0.10

Score >= 0.85 → Auto-proceed
Score <  0.85 → Human review flag + optional Sonnet escalation
```

---

## 6. Self-Healing Engine

### 6.1 Strategy

For every selector extracted from the source file, the Self-Healing Engine generates a prioritised fallback chain:

| Priority | Strategy | Example |
|---|---|---|
| 1 | data-testid attribute | `[data-testid="submit"]` |
| 2 | ARIA role + label | `getByRole('button', { name: 'Submit' })` |
| 3 | CSS ID selector | `#submit-btn` |
| 4 | CSS class selector | `.submit-button` |
| 5 | XPath | `//button[text()='Submit']` |
| 6 | Element + text match | `getByText('Submit')` |

### 6.2 Inline Annotation Format

```typescript
// [SELF-HEAL] Step 4 applied
// Primary   : [data-testid="submit"]
// Fallback 1: getByRole('button', { name: 'Submit' })
// Fallback 2: #submit-btn
// Fallback 3: button[type="submit"]
// Generated by: Claude Haiku 4.5 | Confidence: 96%
await page.locator('[data-testid="submit"]').click();
```

---

## 7. Migration Workflow — Step-by-Step

| Step | Name | Description | Pass Criteria | On Failure |
|---|---|---|---|---|
| 1 | Framework Detection | Parse source code to identify framework (Cypress/Selenium/Robot etc.) | Framework confidently identified | HALT — unknown framework flag |
| 2 | Pattern Identification | Identify test pattern: POM / Cucumber / Mocha / PageFactory / Robot | Pattern matched from known catalogue | HALT — pattern ambiguity flag |
| 3 | Code Transformation | LLM (Haiku 4.5 → Sonnet 4.6) converts source to Playwright target | Confidence ≥ 85% | HALT — human review flag |
| 4 | Self-Healing Application | All selectors annotated with primary + fallback chain | All selectors processed | HALT — unresolved selector flag |
| 5 | CI/CD YAML Generation | Generate pipeline file for selected platform | Valid YAML syntax | HALT — template error |
| 6 | Coverage Analysis | Run coverage tool; enforce 90% line / 85% branch | Coverage thresholds met | WARNING — suggest test stubs |
| 7 | Final Verification | Validate migrated file: syntax check + confidence score | Score ≥ 85%, coverage pass | HALT — block commit |

> **Rule:** Each step must be 100% complete and explicitly confirmed before the next step starts. No step may be skipped.

---

## 8. CI/CD Integration Layer

### 8.1 Platform Comparison

| Feature | Azure DevOps | GitLab CI/CD | Jenkins |
|---|---|---|---|
| Config file | `azure-pipelines.yml` | `.gitlab-ci.yml` | `Jenkinsfile` |
| Trigger | Branch push / PR | Branch push / MR | Webhook / SCM poll |
| Coverage plugin | PublishCodeCoverageResults@1 | `coverage:` keyword + cobertura | Cobertura plugin |
| Test results | PublishTestResults@2 | JUnit artifact | JUnit plugin |
| Playwright image | `ubuntu-latest` + Node install | `mcr.microsoft.com/playwright` | Docker agent |
| Artifact storage | Azure Artifacts | GitLab job artifacts | Jenkins archiveArtifacts |

### 8.2 Generated Pipeline Capabilities (All Platforms)

All three auto-generated pipeline configs include:

- Node.js / Java / Python runtime setup (based on target language)
- Playwright browser installation with dependencies
- Playwright test execution with HTML reporter
- Coverage report generation (Istanbul / JaCoCo / Coverage.py)
- Test result publishing
- Coverage artifact publishing (Cobertura format)
- Fail-fast on coverage threshold breach

---

## 9. Code Coverage Integration

### 9.1 Coverage Tool by Target Language

| Target Language | Coverage Tool | Config File | Report Format |
|---|---|---|---|
| TypeScript | Istanbul (nyc) | `.nycrc.json` | lcov + Cobertura |
| JavaScript | Istanbul (nyc) | `.nycrc.json` | lcov + Cobertura |
| Java | JaCoCo | `pom.xml` / `build.gradle` | XML + HTML |
| Python | Coverage.py | `.coveragerc` | XML + HTML |

### 9.2 Enforcement Thresholds

```json
// .nycrc.json (TypeScript/JavaScript)
{
  "branches"  : 85,
  "lines"     : 90,
  "functions" : 85,
  "statements": 90,
  "check-coverage": true
}
```

```xml
<!-- JaCoCo (Java) — pom.xml rule -->
<rule>
  <element>BUNDLE</element>
  <limits>
    <limit><counter>LINE</counter><value>COVEREDRATIO</value><minimum>0.90</minimum></limit>
    <limit><counter>BRANCH</counter><value>COVEREDRATIO</value><minimum>0.85</minimum></limit>
  </limits>
</rule>
```

```ini
# .coveragerc (Python)
[report]
fail_under = 90
```

### 9.3 Coverage Gap Response

If migrated file coverage is below threshold:
1. Agent logs a `COVERAGE_WARNING` event
2. Agent suggests additional test stubs targeting uncovered branches
3. CI/CD pipeline is configured to fail the build if threshold is not met
4. Coverage report is published as pipeline artifact regardless of pass/fail

---

## 10. Real-Time Progress Tracking

### 10.1 Progress Stage Map

| % | Stage | UI Status |
|---|---|---|
| 0% | File queued for migration | Amber — Queued |
| 10% | Source framework detected + pattern identified | Amber — In Progress |
| 25% | LLM (Claude Haiku 4.5) processing started | Amber — In Progress |
| 50% | Code transformation complete | Amber — In Progress |
| 65% | Self-healing selector rules applied | Amber — In Progress |
| 80% | CI/CD YAML config generated | Amber — In Progress |
| 90% | Coverage analysis complete | Amber — In Progress |
| 100% | Migration verified, file ready | Green — Complete |
| — | Any step failure | Red — Failed |

### 10.2 WebSocket Push Flow

```
Backend (ProgressEmitter)                  Frontend (WebSocket listener)
         │                                           │
         │── PROGRESS {file, 10%, step:2} ─────────▶│ Update Zustand store
         │── PROGRESS {file, 25%, step:3} ─────────▶│ Re-render FileProgressItem
         │── PROGRESS {file, 50%, step:3} ─────────▶│ Animate progress bar
         │── PROGRESS {file, 65%, step:4} ─────────▶│ Update step label
         │── PROGRESS {file, 80%, step:5} ─────────▶│
         │── PROGRESS {file, 90%, step:6} ─────────▶│
         │── COMPLETE {file, 100%, score} ─────────▶│ Set Green status badge
         │                                           │
         │── FAILED   {file, step, reason}─────────▶│ Set Red status badge
                                                     │ Show error panel
```

---

## 11. Data Flow Diagram

```
User Uploads Files
        │
        ▼
React UI (UploadPage) ──POST /api/migrate/upload──▶ Backend API Gateway
                                                              │
                                                              ▼
                                                    Multer File Processor
                                                    Zod Input Validation
                                                              │
                                                              ▼
                                                    Migration Queue (Bull)
                                                    Job created per batch
                                                              │
                                        ┌─────────────────────┘
                                        │  Per file — sequential steps
                                        ▼
                               MigrationOrchestrator
                               ├── Step 1: Detect framework
                               ├── Step 2: Identify pattern
                               ├── Step 3: LLM Transform
                               │     ├── HaikuAgent (primary)
                               │     └── SonnetAgent (fallback if < 85%)
                               ├── Step 4: Self-Healing Engine
                               ├── Step 5: CI/CD YAML Generator
                               ├── Step 6: Coverage Analyzer
                               └── Step 7: Verifier & Scorer
                                        │
                               ProgressEmitter ──WS push──▶ React UI (Progress Dashboard)
                                        │
                                        ▼
                               Output Files Zipped
                               Migration Summary JSON
                                        │
                               ◀── GET /api/migrate/result/:jobId ── React UI (Output Viewer)
```

---

## 12. Technology Stack Summary

### Frontend

| Category | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20.x LTS |
| UI Framework | React.js | 18.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| State Management | Zustand | 4.x |
| HTTP Client | Axios | 1.x |
| Real-time | WebSocket (native) | — |
| Styling | Tailwind CSS | 3.x |
| Components | shadcn/ui | latest |

### Backend

| Category | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20.x LTS |
| Framework | Vite (dev) + Express (prod) | 5.x / 4.x |
| Language | TypeScript | 5.x |
| LLM Base | Claude Haiku 4.5 | 0.33x cost |
| LLM Fallback | Claude Sonnet 4.6 | 1x cost |
| LLM SDK | Anthropic Node.js SDK | latest |
| Job Queue | Bull + Redis | 4.x |
| File Upload | Multer | 1.x |
| Validation | Zod | 3.x |
| CI/CD Templates | Handlebars | 4.x |

### Test Output (Migrated)

| Language | Test Runner | Coverage Tool | Report |
|---|---|---|---|
| TypeScript / JS | Playwright Test | Istanbul (nyc) | HTML + Cobertura |
| Java | Playwright Java + JUnit 5 | JaCoCo | XML + HTML |
| Python | pytest-playwright | Coverage.py | XML + HTML |

### CI/CD Targets

| Platform | Config Generated | Coverage Artifact |
|---|---|---|
| Azure DevOps | `azure-pipelines.yml` | PublishCodeCoverageResults@1 |
| GitLab CI/CD | `.gitlab-ci.yml` | Cobertura report artifact |
| Jenkins | `Jenkinsfile` (Declarative) | Cobertura plugin |

---

## 13. Security Considerations

| Concern | Mitigation |
|---|---|
| File upload abuse | Multer: file type allowlist (.ts, .js, .java, .py, .feature, .xml), max file size 10MB, max files 50 per batch |
| Path traversal | All uploaded files stored in isolated temp directory with UUID-named subfolders; filenames sanitised |
| LLM prompt injection | Source code is passed as data within a structured prompt boundary — never interpolated into system prompt instructions |
| API authentication | Bearer token required on all `/api/` endpoints (JWT) |
| WebSocket auth | WebSocket connection requires valid jobId + session token |
| Sensitive data in code | Source code files are deleted from server after job completion (TTL: 1 hour) |
| Dependency security | `npm audit` enforced in CI pipeline; no critical/high vulnerabilities allowed |

---

## 14. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Cloud Deployment                         │
│                                                                 │
│  ┌──────────────────────┐         ┌─────────────────────────┐  │
│  │   Frontend (React)   │         │   Backend (Node.js)     │  │
│  │   Static hosting /   │◀──API──▶│   Express + Vite        │  │
│  │   CDN (Azure Static  │         │   Container (Docker)    │  │
│  │   Web Apps /         │         │   Port 3001             │  │
│  │   Netlify / Vercel)  │         └────────────┬────────────┘  │
│  └──────────────────────┘                      │               │
│                                                ▼               │
│                                    ┌──────────────────────┐   │
│                                    │   Redis (Bull Queue) │   │
│                                    │   Azure Cache /      │   │
│                                    │   ElastiCache        │   │
│                                    └──────────────────────┘   │
│                                                │               │
│                                                ▼               │
│                                    ┌──────────────────────┐   │
│                                    │   Anthropic API      │   │
│                                    │   Claude Haiku 4.5   │   │
│                                    │   Claude Sonnet 4.6  │   │
│                                    └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Docker Compose (Local Development)

```yaml
version: '3.9'
services:
  frontend:
    build: ./frontend
    ports: [ "3000:3000" ]
    environment:
      - VITE_API_URL=http://backend:3001

  backend:
    build: ./backend
    ports: [ "3001:3001" ]
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on: [ redis ]

  redis:
    image: redis:7-alpine
    ports: [ "6379:6379" ]
```

---

*Document generated for Hackathon: Migration Agentic Tool — Phase 1*
*ICEPOT Framework applied — see ICEPOT-Hackathon-Migration.txt*
