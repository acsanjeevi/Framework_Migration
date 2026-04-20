import 'dotenv/config';
import http from 'http';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import healthRouter from './api/routes/health.routes';
import migrateRouter from './api/routes/migrate.routes';
import { progressEmitter } from './websocket/ProgressEmitter';

const app: Application = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow the React dev server on any localhost port (3000-3999) plus any
// explicit origins in CORS_ORIGIN env var (comma-separated).
const EXPLICIT_ORIGINS = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // Allow any localhost / 127.0.0.1 origin regardless of port
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      // Allow explicitly configured origins
      if (EXPLICIT_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  })
);

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/migrate', migrateRouter);

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});

// ── HTTP server (required for WebSocket co-hosting) ──────────────────────────
const server = http.createServer(app);

// ── WebSocket server — noServer mode, manual upgrade handling ────────────────
const wss = new WebSocketServer({ noServer: true });

const WS_PATH_PATTERN = /^\/ws\/progress\/([^/]+)$/;

server.on('upgrade', (request, socket, head) => {
  const rawUrl = request.url ?? '';
  const match = rawUrl.match(WS_PATH_PATTERN);

  if (!match) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  const jobId = decodeURIComponent(match[1]);

  wss.handleUpgrade(request, socket, head, (ws) => {
    progressEmitter.register(jobId, ws);
    // Confirm connection to the client immediately
    ws.send(JSON.stringify({ type: 'CONNECTED', jobId, fileName: '', percentage: 0, step: 0, stepName: '', agentUsed: 'stub' }));
    console.log(`[ws] Client connected for jobId: ${jobId}`);
  });
});

wss.on('error', (err) => {
  console.error('[ws] WebSocketServer error:', err.message);
});

// ── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`[server] Backend running     → http://localhost:${PORT}`);
  console.log(`[server] Health check        → http://localhost:${PORT}/health`);
  console.log(`[server] Phase statuses      → http://localhost:${PORT}/health/phases`);
  console.log(`[server] Upload health       → http://localhost:${PORT}/health/upload`);
  console.log(`[server] Orchestrator health → http://localhost:${PORT}/health/orchestrator`);
  console.log(`[server] Queue health        → http://localhost:${PORT}/health/queue`);
  console.log(`[server] LLM health          → http://localhost:${PORT}/health/llm`);
  console.log(`[server] Self-heal health    → http://localhost:${PORT}/health/selfheal`);
  console.log(`[server] CI/CD health        → http://localhost:${PORT}/health/cicd`);
  console.log(`[server] Coverage health     → http://localhost:${PORT}/health/coverage`);
  console.log(`[server] Migrate upload      → POST http://localhost:${PORT}/api/migrate/upload`);
  console.log(`[server] Migrate status      → GET  http://localhost:${PORT}/api/migrate/status/:jobId`);
  console.log(`[server] Migrate result      → GET  http://localhost:${PORT}/api/migrate/result/:jobId`);
  console.log(`[server] Migrate summary     → GET  http://localhost:${PORT}/api/migrate/summary/:jobId`);
  console.log(`[server] WS progress         → WS   ws://localhost:${PORT}/ws/progress/:jobId`);
});

export default app;

