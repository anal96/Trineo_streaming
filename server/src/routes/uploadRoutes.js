import express from 'express';
import { uploadVideo, getStreamFile, getUploadJobs } from '../controllers/uploadController.js';
import { upload } from '../middleware/upload.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Course } from '../models/Course.js';
import { Program } from '../models/Program.js';
import { Lesson } from '../models/Lesson.js';

const router = express.Router();

router.post(
  '/upload',
  protect,
  adminOnly,
  tenantGuard({
    resolveResource: async (req, courseId) => {
      let resource = await Course.findById(courseId).select('institute');
      if (!resource) {
        resource = await Program.findById(courseId).select('institute');
      }
      return resource;
    },
    bodyParam: 'courseId'
  }),
  upload.single('video'),
  uploadVideo
);
router.get('/jobs', protect, adminOnly, getUploadJobs);
router.get('/stream/:lessonId/:fileName', protect, tenantGuard({ model: Lesson, idParam: 'lessonId' }), getStreamFile);

export default router;
