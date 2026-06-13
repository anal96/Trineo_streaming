import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getCourseLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  bulkUpdateLessons,
  retryFailedUpload,
  getLessonUploadHistory
} from '../controllers/lessonManagementController.js';
import { replaceLessonVideo } from '../controllers/youtubeController.js';

const router = express.Router();

router.get('/course/:courseId', protect, adminOnly, getCourseLessons);
router.post('/', protect, adminOnly, createLesson);
router.put('/:id', protect, adminOnly, updateLesson);
router.delete('/:id', protect, adminOnly, deleteLesson);
router.post('/reorder', protect, adminOnly, reorderLessons);
router.post('/bulk', protect, adminOnly, bulkUpdateLessons);
router.post('/:id/replace-video', protect, adminOnly, upload.single('video'), replaceLessonVideo);
router.post('/:id/retry-upload', protect, adminOnly, retryFailedUpload);
router.get('/:id/upload-history', protect, adminOnly, getLessonUploadHistory);

export default router;
