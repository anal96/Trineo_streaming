import express from 'express';
import { getCourses, getCourseById, getCourseBySlug, createCourse, updateCourse, deleteCourse } from '../controllers/courseController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Course } from '../models/Course.js';

const router = express.Router();

router.route('/')
  .get(protect, getCourses)
  .post(protect, adminOnly, createCourse);

router.get('/slug/:slug', protect, getCourseBySlug);

router.route('/:id')
  .get(protect, tenantGuard({ model: Course, idParam: 'id' }), getCourseById)
  .put(protect, adminOnly, tenantGuard({ model: Course, idParam: 'id' }), updateCourse)
  .delete(protect, adminOnly, tenantGuard({ model: Course, idParam: 'id' }), deleteCourse);

export default router;
