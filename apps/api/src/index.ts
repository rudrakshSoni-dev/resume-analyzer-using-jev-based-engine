import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import jobRoutes from './routes/job.routes.js';
import analysisRoutes from './routes/analysis.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.disable('x-powered-by');

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Resume routes
app.use('/api/resumes', resumeRoutes);

// Job routes
app.use('/api/jobs', jobRoutes);

// Analysis routes
app.use('/api/analysis', analysisRoutes);

// 404 fallback for undefined routes - always return JSON { error: { message } }
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.path}` },
  });
});

// Centralized error handler (must be last middleware)
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  // Handle syntax error from express.json() (malformed JSON payloads)
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({
      error: { message: 'Invalid JSON payload' },
    });
  }

  // Determine HTTP status code from statusCode or status properties
  let statusCode = 500;
  if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
    statusCode = err.statusCode;
  } else if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
    statusCode = err.status;
  }

  // Determine client-safe message
  let message: string;
  if (statusCode >= 400 && statusCode < 500) {
    message = err.message || 'Client error';
  } else {
    // 500 Internal Server Error: mask internal details and stack traces in production
    console.error('Unhandled internal error:', err);
    message =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error';
  }

  // Scrub any database URLs or JWT secrets if they accidentally appear in error strings
  if (message.includes('postgres://') || message.includes('postgresql://')) {
    message = 'Internal server error';
  }
  if (process.env.DATABASE_URL && message.includes(process.env.DATABASE_URL)) {
    message = 'Internal server error';
  }
  if (process.env.JWT_SECRET && message.includes(process.env.JWT_SECRET)) {
    message = 'Internal server error';
  }

  res.status(statusCode).json({
    error: { message },
  });
});

export { app };

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

