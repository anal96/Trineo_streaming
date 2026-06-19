import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getUnitLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  bulkUpdateLessons
} from '../controllers/lessonManagementController.js';

const router = express.Router();

router.get('/', protect, adminOnly, getUnitLessons);
router.post('/', protect, adminOnly, createLesson);
router.put('/:id', protect, adminOnly, updateLesson);
router.delete('/:id', protect, adminOnly, deleteLesson);
router.post('/reorder', protect, adminOnly, reorderLessons);
router.post('/bulk', protect, adminOnly, bulkUpdateLessons);

export default router;
