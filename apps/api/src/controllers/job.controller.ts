import { Request, Response, NextFunction } from 'express';
import { jobService } from '../services/job.service.js';
import { createJobDescriptionSchema } from '../utils/validation.js';
import { ZodError } from 'zod';

/**
 * POST /api/jobs
 * Create a new job description for the authenticated user
 */
export async function createJobHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: 'Authentication required' },
      });
      return;
    }

    const validatedData = createJobDescriptionSchema.parse(req.body);
    const job = await jobService.createJob(req.user.id, validatedData);

    res.status(201).json({ job });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: { message: error.errors[0].message },
      });
      return;
    }
    next(error);
  }
}

/**
 * GET /api/jobs
 * List all job descriptions for the authenticated user
 */
export async function listJobsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: 'Authentication required' },
      });
      return;
    }

    const jobs = await jobService.getUserJobs(req.user.id);
    res.status(200).json({ jobs });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/:id
 * Get a single job description by ID for the authenticated user (with ownership check)
 */
export async function getJobByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: 'Authentication required' },
      });
      return;
    }

    const job = await jobService.getJobById(req.user.id, req.params.id);
    res.status(200).json({ job });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/jobs/:id
 * Delete a single job description by ID for the authenticated user
 */
export async function deleteJobHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        error: { message: 'Authentication required' },
      });
      return;
    }

    await jobService.deleteJob(req.user.id, req.params.id);
    res.status(200).json({ message: 'Job description deleted successfully' });
  } catch (error) {
    next(error);
  }
}
