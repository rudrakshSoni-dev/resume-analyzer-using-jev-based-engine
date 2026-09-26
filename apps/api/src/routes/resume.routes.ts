import { Router } from 'express';
import * as resumeController from '../controllers/resume.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadResume } from '../middleware/upload.middleware.js';

const router = Router();

// All resume routes require authentication
router.use(authMiddleware);

router.post('/', uploadResume, resumeController.uploadResumeHandler);
router.get('/', resumeController.listResumesHandler);
router.get('/:id', resumeController.getResumeByIdHandler);
router.delete('/:id', resumeController.deleteResumeHandler);

export default router;
