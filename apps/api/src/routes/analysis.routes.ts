import { Router } from 'express';
import * as analysisController from '../controllers/analysis.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All analysis routes require authentication
router.use(authMiddleware);

router.post('/', analysisController.createAnalysisHandler);
router.get('/', analysisController.listAnalysesHandler);
router.get('/:id', analysisController.getAnalysisByIdHandler);
router.delete('/:id', analysisController.deleteAnalysisHandler);

export default router;
