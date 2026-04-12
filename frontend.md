# Frontend Architecture — Hackathon: Migration Agentic Tool
**Phase 1 — AI-Powered Automation Framework Migration with Self-Healing Support**
**Date:** April 11, 2026
**Version:** 1.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Real-Time Progress Tracking](#4-real-time-progress-tracking)
5. [Technology Stack — Frontend](#5-technology-stack--frontend)
6. [Deployment Architecture — Frontend](#6-deployment-architecture--frontend)

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
│                   [See backend.md for full backend details]             │
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

## 4. Real-Time Progress Tracking

### 4.1 Progress Stage Map

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

### 4.2 WebSocket Push Flow

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

## 5. Technology Stack — Frontend

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

---

## 6. Deployment Architecture — Frontend

```
┌──────────────────────┐
│   Frontend (React)   │
│   Static hosting /   │◀──API──▶ Backend (Node.js) [see backend.md]
│   CDN (Azure Static  │
│   Web Apps /         │
│   Netlify / Vercel)  │
└──────────────────────┘
```

### Docker Compose — Frontend Service (Local Development)

```yaml
services:
  frontend:
    build: ./frontend
    ports: [ "3000:3000" ]
    environment:
      - VITE_API_URL=http://backend:3001
```

> For the full Docker Compose configuration including backend and Redis services, see **backend.md**.

---

*Document generated for Hackathon: Migration Agentic Tool — Phase 1*
*ICEPOT Framework applied — see ICEPOT-Hackathon-Migration.txt*
