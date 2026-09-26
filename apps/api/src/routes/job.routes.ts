import { Router } from 'express';
import * as jobController from '../controllers/job.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All job routes require authentication
router.use(authMiddleware);

router.post('/', jobController.createJobHandler);
router.get('/', jobController.listJobsHandler);
router.get('/:id', jobController.getJobByIdHandler);
router.delete('/:id', jobController.deleteJobHandler);

export default router;
