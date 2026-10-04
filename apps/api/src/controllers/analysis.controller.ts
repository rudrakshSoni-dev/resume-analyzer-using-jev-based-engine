import { Request, Response, NextFunction } from 'express';
import { analysisService } from '../services/analysis.service.js';
import { createAnalysisSchema } from '../utils/validation.js';
import { ZodError } from 'zod';

/**
 * POST /api/analysis
 * Run JEV scoring engine against user-owned resume & job description
 */
export async function createAnalysisHandler(
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

    const validatedData = createAnalysisSchema.parse(req.body);
    const analysis = await analysisService.createAnalysis(req.user.id, validatedData);

    res.status(201).json({
      id: analysis.id,
      score: analysis.score,
      analysis,
    });
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
 * GET /api/analysis
 * List all past analyses for the authenticated user
 */
export async function listAnalysesHandler(
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

    const analyses = await analysisService.getUserAnalyses(req.user.id);
    res.status(200).json({ analyses });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/analysis/:id
 * Retrieve a single analysis by ID with ownership verification
 */
export async function getAnalysisByIdHandler(
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

    const analysis = await analysisService.getAnalysisById(req.user.id, req.params.id);
    res.status(200).json({ analysis });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/analysis/:id
 * Delete a past analysis record ensuring user ownership
 */
export async function deleteAnalysisHandler(
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

    await analysisService.deleteAnalysis(req.user.id, req.params.id);
    res.status(200).json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    next(error);
  }
}
