import express from 'express';
import { updateProgress, getWatchHistory } from '../controllers/progressController.js';
import { protect } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Lesson } from '../models/Lesson.js';

const router = express.Router();

router.post('/update', protect, tenantGuard({ model: Lesson, bodyParam: 'lessonId' }), updateProgress);
router.get('/history', protect, getWatchHistory);

export default router;
