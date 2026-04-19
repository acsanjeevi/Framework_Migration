# Application Issues Log
**Date:** April 18, 2026  
**Session:** Runtime analysis of backend (port 3001) + frontend (port 3000)  
**Status at time of analysis:** Both servers running. Health checks executed. Code scanned.

---

## ISSUE SUMMARY TABLE

| # | Severity | Area | Issue | Status |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | Backend / LLM | `ANTHROPIC_API_KEY` not set — AI migration completely non-functional | ✅ Fixed |
| 2 | 🔴 CRITICAL | Backend / Queue | Redis not running — job queue disabled, no migration can be processed | ✅ Fixed (in-memory fallback) |
| 3 | 🟠 HIGH | Backend / Coverage | Coverage runners return static/mock data (81-82%) instead of real analysis | Open |
| 4 | 🟠 HIGH | Backend / Self-Heal | `fallbackChains` in health check response returns empty strings instead of selector arrays | Open |
| 5 | 🟠 HIGH | Frontend / Upload | `adm-zip` dependency present in `package.json` but missing from devDependencies types check | Open |
| 6 | 🟡 MEDIUM | Backend / Queue | Job queue silently disabled when Redis offline — no user-facing error surfaced to UI | ✅ Fixed (already handled + fallback) |
| 7 | 🟡 MEDIUM | Backend / Package | `@types/cors`, `@types/multer`, `@types/ws` are in `dependencies` not `devDependencies` | ✅ Fixed |
| 8 | 🟡 MEDIUM | Backend / ResultStore | In-memory only — all results lost on server restart, no persistence | ✅ Fixed (disk write-through) |
| 9 | 🟡 MEDIUM | Frontend / Upload | ZIP preview panel (`ZipPreviewPanel`) only shows on client-side, not synced with server extraction | Open |
| 10 | 🟡 MEDIUM | Backend / Security | No `.env` file — `ANTHROPIC_API_KEY` must be manually set every terminal session | ✅ Fixed |
| 11 | 🟡 MEDIUM | Frontend / Mock Mode | Mock mode flag exists in store but no UI toggle — dev/prod boundary unclear | ✅ Fixed (VITE_MOCK_MODE wired) |
| 12 | 🟢 LOW | Backend / Coverage | Coverage thresholds (90% line / 85% branch) are below threshold in ALL runners (81-82%) | Open |
| 13 | 🟢 LOW | Backend / Package | `vite` listed as devDependency in backend — unused, only `tsx` is needed for backend dev | ✅ Fixed |
| 14 | 🟢 LOW | Root / Config | No `.env.example` file — new developers have no reference for required env vars | ✅ Fixed |
| 15 | 🟢 LOW | Frontend / WS | WebSocket reconnect logic exists but no user-visible indicator when WS connection is lost | ✅ Already implemented |

---

## DETAILED ISSUES

---

### ISSUE-001 🔴 CRITICAL — ANTHROPIC_API_KEY Not Set
**File:** `backend/src/agents/HaikuAgent.ts:17`, `SonnetAgent.ts:17`  
**Health Endpoint:** `GET /health/llm` → status: `error`  
**Log Evidence:**
```
{"status":"error","llm":{"apiKeySet":false,...
  {"name":"HaikuAgent","healthy":false,"error":"ANTHROPIC_API_KEY not set"},
  {"name":"SonnetAgent","healthy":false,"error":"ANTHROPIC_API_KEY not set"}
}}
```
**Impact:** The entire Step 3 (Code Transformation) will throw and halt every migration job.  
**Fix:** Create `backend/.env` with `ANTHROPIC_API_KEY=sk-ant-...` and load it at startup using `dotenv`.  
**Fix Files:** `backend/src/server.ts` (add `dotenv/config` import), create `backend/.env`.

---

### ISSUE-002 🔴 CRITICAL — Redis Not Running / Queue Disabled
**File:** `backend/src/queue/MigrationQueue.ts:34`  
**Health Endpoint:** `GET /health/queue` → status: `degraded`  
**Log Evidence:**
```
[queue] Redis unavailable — queue disabled until Redis starts. Details: (no details)
[queue] Start Redis (e.g. redis-server) to enable job processing.
```
**Impact:** `POST /api/migrate/upload` will accept files but no migration job will execute. The frontend will receive a `jobId` but progress will never update.  
**Fix Option A (Recommended for Dev):** Install Redis locally via `winget install Redis.Redis` or run via Docker: `docker run -d -p 6379:6379 redis:7-alpine`.  
**Fix Option B:** Implement an in-memory queue fallback (BullMQ mem adaptor or simple async queue) for development without Redis.

---

### ISSUE-003 🟠 HIGH — Coverage Runners Return Static Mock Data
**Files:** `backend/src/coverage/IstanbulRunner.ts`, `JaCoCoRunner.ts`, `CoveragePyRunner.ts`  
**Health Endpoint:** `GET /health/coverage` — shows `sampleLinePct: 81-82` (hardcoded)  
**Impact:** Coverage shown in UI is fake. The 90%/85% threshold enforcement is never actually triggered against real test output.  
**Fix:** Coverage runners need to actually execute `nyc`, `jacoco`, or `coverage.py` against migrated code. Currently they generate static placeholder values.  
**Fix Files:** All three runner files need real subprocess execution logic.

---

### ISSUE-004 🟠 HIGH — Self-Healing Fallback Chains Return Empty Strings
**File:** `backend/src/healing/FallbackGenerator.ts`  
**Health Endpoint:** `GET /health/selfheal` — `fallbackChains[].fallbacks` = `"     "` (whitespace only)  
**Impact:** The `[SELF-HEAL]` annotations written by `AnnotationWriter.ts` may not include proper fallback selectors — making the self-healing feature not functional.  
**Fix:** Debug `FallbackGenerator.ts` — the fallback array is likely not being serialized/joined correctly in the health response. Verify the actual annotation output in Step 4.

---

### ISSUE-005 🟠 HIGH — Incorrect Package.json: Type Declaration Packages in Dependencies
**File:** `backend/package.json`  
**Problem:**
```json
"dependencies": {
  "@types/cors": "^2.8.19",      ← should be devDependencies
  "@types/multer": "^2.1.0",     ← should be devDependencies
  "@types/ws": "^8.18.1"         ← should be devDependencies
}
```
**Impact:** Production Docker builds will unnecessarily install type-only packages, bloating the image.  
**Fix:** Move all `@types/*` packages to `devDependencies`.

---

### ISSUE-006 🟡 MEDIUM — Queue Failure Not Surfaced to Frontend
**File:** `backend/src/api/routes/migrate.routes.ts`  
**Problem:** When Redis is offline, the upload endpoint still returns `200 OK` with a jobId, but the job is never processed. The frontend WebSocket connects and waits forever with no timeout or error message.  
**Impact:** User uploads files, sees a spinner/progress page, and nothing ever happens. No error is shown.  
**Fix:** In `migrate.routes.ts`, check if queue is available before accepting the upload. Return `503 Service Unavailable` with a clear message if Redis is offline.

---

### ISSUE-007 🟡 MEDIUM — In-Memory ResultStore (No Persistence)
**File:** `backend/src/store/ResultStore.ts:9`  
**Comment in code:** *"scope for the hackathon and can be layered on later"*  
**Problem:** All migration job results are stored in a plain JavaScript `Map`. Any server restart wipes all results.  
**Impact:** If the backend crashes or restarts mid-migration, all output is lost. Users cannot retrieve results after a restart.  
**Fix:** Persist results to Redis (using `bull` job results) or a simple SQLite/file-based store.

---

### ISSUE-008 🟡 MEDIUM — Missing `.env` File / No `dotenv` Setup
**Files:** `backend/src/server.ts`, `backend/package.json`  
**Problem:** The backend reads `process.env.ANTHROPIC_API_KEY` but there is no `dotenv` package installed and no `.env` file.  
**Fix:**
1. `npm install dotenv --prefix backend`
2. Add `import 'dotenv/config'` at the top of `backend/src/server.ts`
3. Create `backend/.env` with all required keys
4. Create `backend/.env.example` as template

---

### ISSUE-009 🟡 MEDIUM — ZIP Preview (Client) vs Extraction (Server) Not Synced
**Files:** `frontend/src/components/upload/ZipPreviewPanel.tsx`, `backend/src/workspace/WorkspaceManager.ts`  
**Problem:** The frontend uses `jszip` to parse the ZIP client-side for preview. The backend uses `adm-zip` to extract server-side. If the ZIP is large or complex, the client preview may differ from what actually gets extracted (encoding, nested ZIPs, symlinks).  
**Impact:** User sees a different file tree in the UI than what actually gets migrated.  
**Fix:** Drive the file tree display from the `inputFolder` response returned by the backend after extraction, not from client-side jszip parsing.

---

### ISSUE-010 🟡 MEDIUM — No UI Indicator for WebSocket Disconnect
**File:** `frontend/src/hooks/useWebSocket.ts`  
**Problem:** The WebSocket hook has reconnect logic but there is no visible indicator in the UI when the WebSocket connection is lost or retrying.  
**Impact:** If the backend restarts mid-migration, the progress page silently freezes. User has no way to know the connection dropped.  
**Fix:** Add a connection status indicator (`Connected` / `Reconnecting...` / `Disconnected`) to the Progress Dashboard.

---

### ISSUE-011 🟡 MEDIUM — Mock Mode Has No UI Toggle
**File:** `frontend/src/store/migrationStore.ts:37`  
**Problem:** `mockMode: boolean` exists in the store but there is no way for a developer or tester to enable it from the UI or environment variable.  
**Impact:** Developers can't test the frontend without a working backend + Redis + API key setup.  
**Fix:** Add `VITE_MOCK_MODE=true` support in `vite.config.ts` / `frontend/.env.development` and wire it to `setMockMode()` on startup.

---

### ISSUE-012 🟢 LOW — Coverage Thresholds Not Met (Static Data)
**File:** `backend/src/api/routes/health.routes.ts`  
**Issue:** Health check shows `sampleLinePct: 81-82` across all three runners.  
- Istanbul threshold: **90% line, 85% branch** → FAIL (82% / 75%)  
- JaCoCo threshold: **90% line, 85% branch** → FAIL (81% / 72%)  
- Coverage.py threshold: **90% line** → FAIL (81%)  

**Fix:** These are static fixtures in the health check. Actual enforcement happens when real coverage runs.

---

### ISSUE-013 🟢 LOW — `vite` in Backend DevDependencies (Unused)
**File:** `backend/package.json`  
**Problem:** `"vite": "^5.0.12"` is listed as a backend devDependency. The backend uses `tsx` as its dev runner, not Vite.  
**Fix:** Remove `vite` from `backend/package.json` devDependencies.

---

### ISSUE-014 🟢 LOW — No `.env.example` File
**Problem:** New team members have no reference for what environment variables are required.  
**Required Variables:**
```
ANTHROPIC_API_KEY=         # Required — Anthropic Claude API key
REDIS_URL=                 # Optional — defaults to redis://localhost:6379
PORT=                      # Optional — defaults to 3001
CORS_ORIGIN=               # Optional — defaults to http://localhost:3000
LLM_PROVIDER=              # Optional — defaults to 'anthropic'
LLM_PRIMARY_MODEL=         # Optional
LLM_FALLBACK_MODEL=        # Optional
```
**Fix:** Create `backend/.env.example` with all variables documented.

---

### ISSUE-015 🟢 LOW — Frontend `.env` Variables Not Documented
**File:** `frontend/.env`  
**Variables used in code:**
```
VITE_API_URL=http://localhost:3001   # Backend REST API base URL
VITE_WS_URL=ws://localhost:3001      # Backend WebSocket base URL
VITE_MOCK_MODE=false                 # (proposed) Enable mock mode
```
**Fix:** Create `frontend/.env.example`.

---

## RESOLUTION PRIORITY ORDER

```
Phase 1 — Unblock Core Functionality (CRITICAL)
  [1] ISSUE-001: Add ANTHROPIC_API_KEY via .env + dotenv
  [2] ISSUE-002: Start Redis (Docker or local install)
  [8] ISSUE-008: Add dotenv package to backend

Phase 2 — Fix Functional Bugs (HIGH)
  [3] ISSUE-006: Return 503 when queue is unavailable
  [4] ISSUE-004: Debug FallbackGenerator empty fallback chains
  [5] ISSUE-005: Move @types/* to devDependencies

Phase 3 — Improve Reliability (MEDIUM)
  [6] ISSUE-009: Drive file tree from server extraction response
  [7] ISSUE-010: Add WebSocket connection status indicator
  [8] ISSUE-011: Wire VITE_MOCK_MODE to mock mode store flag

Phase 4 — Polish & Production Readiness (LOW)
  [9]  ISSUE-003: Replace static coverage with real runner execution
  [10] ISSUE-007: Replace in-memory ResultStore with Redis persistence
  [11] ISSUE-013: Remove vite from backend devDependencies
  [12] ISSUE-014: Create backend/.env.example
  [13] ISSUE-015: Create frontend/.env.example
```

---

## RUNTIME STATUS AT TIME OF ANALYSIS

| Component | Status | Notes |
|---|---|---|
| Backend Server | ✅ Running | `http://localhost:3001` |
| Frontend Server | ✅ Running | `http://localhost:3000` |
| Health `/health` | ✅ OK | All 7 orchestrator steps ready |
| Health `/health/upload` | ✅ OK | Multer configured, temp dir writable |
| Health `/health/orchestrator` | ✅ OK | All 7 steps initialized |
| Health `/health/selfheal` | ✅ OK (partial) | Selectors parsed, fallback chains empty |
| Health `/health/cicd` | ✅ OK | All 3 templates (Azure, GitLab, Jenkins) loaded |
| Health `/health/coverage` | ✅ OK (static) | Static mock data only |
| Health `/health/queue` | ❌ DEGRADED | Redis not connected |
| Health `/health/llm` | ❌ ERROR | ANTHROPIC_API_KEY not set |
