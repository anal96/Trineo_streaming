import express from 'express';
import { uploadVideo, getStreamFile, getUploadJobs } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Course } from '../models/Course.js';
import { Lesson } from '../models/Lesson.js';

const router = express.Router();

router.post('/upload', protect, adminOnly, tenantGuard({ model: Course, bodyParam: 'courseId' }), upload.single('video'), uploadVideo);
router.get('/jobs', protect, adminOnly, getUploadJobs);
router.get('/stream/:lessonId/:fileName', protect, tenantGuard({ model: Lesson, idParam: 'lessonId' }), getStreamFile);

export default router;
