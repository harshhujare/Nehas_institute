import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { notesRouter } from './routes/notes';
import { paymentsRouter } from './routes/payments';
import { adminRouter } from './routes/admin';
import { announcementsRouter } from './routes/announcements';
import { supportRouter } from './routes/support';
import { faqsRouter } from './routes/faqs';
import { coursesRouter } from './routes/courses';
import { lecturesRouter } from './routes/lectures';
import { adminCoursesRouter } from './routes/admin/courses';
import { bunnyWebhookRouter } from './routes/webhooks/bunny';
import { reconcileRouter } from './routes/internal/reconcile';
import { errorHandler } from './middleware/error';
import { captureRawBody } from './middleware/rawBody';
import { prisma, withRetry } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Global error guards (keep server alive on Neon cold-start timeouts) ──────
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection] Caught — server will continue:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] Caught — server will continue:', err.message);
});

// ─── Middleware ───────────────────────────────────────────────────────────────
const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

const allowedOrigins = Array.from(new Set([
  ...configuredOrigins,
  'http://localhost:3000',
  'http://localhost:3001',
]));

app.use(cors({
  origin: (origin, cb) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      (origin.startsWith('http://localhost:')) ||
      (origin.endsWith('.vercel.app'))
    ) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

// ─── Webhook raw body capture ──────────────────────────────────────────────────
// Must be registered BEFORE express.json() so the raw bytes are preserved.
// Razorpay and Bunny compute HMAC over the exact bytes sent.
app.use('/api/payments/webhook', captureRawBody);
app.use('/api/webhooks/bunny', captureRawBody);

app.use(express.json());
app.use(cookieParser());

// ─── Health check (also pings DB to keep Neon awake) ──────────────────────────
// GET /health, /api/health, /api/keep-alive
// Use the API URL in cron, not the Vercel frontend URL. These endpoints wake
// the Render server and run SELECT 1 so Neon also stays warm.
async function pingDatabase() {
  await withRetry(() => prisma.$queryRaw`SELECT 1`, 2);
}

const healthHandler: express.RequestHandler = async (_req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  });

  try {
    await pingDatabase();
    res.json({
      status: 'ok',
      server: 'ok',
      db: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[health] Database ping failed:', error);
    res.status(503).json({
      status: 'degraded',
      server: 'ok',
      db: 'error',
      timestamp: new Date().toISOString(),
    });
  }
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
app.get('/api/keep-alive', healthHandler);

// ─── Connectivity probe ───────────────────────────────────────────────────────
// GET /api/ping
// Used by the frontend useOnlineStatus hook to verify real internet reachability.
// Must NOT hit the DB — we only want to confirm the network path to the server
// is open. Responds immediately so even 2G/3G clients get a fast reply.
// Cache-Control: no-store prevents CDNs/proxies from caching the 200 and
// serving it when the origin is actually unreachable.
app.get('/api/ping', (_req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  });
  res.status(200).json({ ok: true });
});

// ─── Mock TUS Upload handler (Local Dev) ─────────────────────────────────────────
app.post('/api/mock/tusupload', (_req, res) => {
  res.set({
    'Tus-Resumable': '1.0.0',
    'Location': 'http://localhost:4000/api/mock/tusupload/file-mock-123',
    'Upload-Offset': '0',
    'Access-Control-Expose-Headers': 'Location, Tus-Resumable, Upload-Offset',
  });
  res.status(201).end();
});
app.patch('/api/mock/tusupload/:id', (req, res) => {
  const uploadLength = req.headers['upload-length'] || '1048576';
  res.set({
    'Tus-Resumable': '1.0.0',
    'Upload-Offset': String(uploadLength),
    'Access-Control-Expose-Headers': 'Tus-Resumable, Upload-Offset',
  });
  res.status(204).end();
});
app.head('/api/mock/tusupload/:id', (_req, res) => {
  res.set({
    'Tus-Resumable': '1.0.0',
    'Upload-Offset': '1048576',
    'Upload-Length': '1048576',
    'Access-Control-Expose-Headers': 'Tus-Resumable, Upload-Offset, Upload-Length',
  });
  res.status(200).end();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/support', supportRouter);
app.use('/api/faqs', faqsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/lectures', lecturesRouter);
app.use('/api/admin/courses', adminCoursesRouter);
app.use('/api/webhooks/bunny', bunnyWebhookRouter);
app.use('/api/internal/reconcile', reconcileRouter);
app.use('/internal/reconcile', reconcileRouter);

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Neha's Institute API running on http://localhost:${PORT}`);
});

export default app;
