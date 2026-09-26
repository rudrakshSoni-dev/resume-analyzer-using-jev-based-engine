import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import resumeRoutes from './routes/resume.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

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

// Centralized error handler (must be last middleware)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err); // Log for debugging

  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  res.status(err.statusCode || 500).json({
    error: { message },
  });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
