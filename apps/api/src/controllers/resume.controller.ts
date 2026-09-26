import { Request, Response, NextFunction } from 'express';
import { resumeService } from '../services/resume.service.js';

/**
 * POST /api/resumes
 * Upload and parse a PDF resume for the authenticated user
 */
export async function uploadResumeHandler(
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

    if (!req.file) {
      res.status(400).json({
        error: { message: 'No file uploaded. Provide a PDF with field name "resume"' },
      });
      return;
    }

    const { originalname, buffer, size } = req.file;
    const resume = await resumeService.createResume(req.user.id, originalname, buffer, size);

    res.status(201).json({ resume });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/resumes
 * List all resumes for the authenticated user
 */
export async function listResumesHandler(
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

    const resumes = await resumeService.getUserResumes(req.user.id);
    res.status(200).json({ resumes });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/resumes/:id
 * Get single resume by ID for the authenticated user (with ownership check)
 */
export async function getResumeByIdHandler(
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

    const resume = await resumeService.getResumeById(req.user.id, req.params.id);
    res.status(200).json({ resume });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/resumes/:id
 * Delete single resume by ID for the authenticated user
 */
export async function deleteResumeHandler(
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

    await resumeService.deleteResume(req.user.id, req.params.id);
    res.status(200).json({ message: 'Resume deleted successfully' });
  } catch (error) {
    next(error);
  }
}
