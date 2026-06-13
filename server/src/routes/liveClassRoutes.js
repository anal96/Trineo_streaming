import express from 'express';
import {
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
  getLiveClasses,
  getLiveClassesByCourse,
  joinLiveClass,
  getLiveClassAttendance
} from '../controllers/liveClassController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { LiveClass } from '../models/LiveClass.js';

const router = express.Router();

// List all classes / Create class
router.route('/')
  .get(protect, getLiveClasses)
  .post(protect, adminOnly, createLiveClass);

// Course classes retrieval
router.route('/course/:courseId')
  .get(protect, getLiveClassesByCourse);

// Admin get attendance records
router.route('/:id/attendance')
  .get(protect, adminOnly, tenantGuard({ model: LiveClass, idParam: 'id' }), getLiveClassAttendance);

// Update / delete live class
router.route('/:id')
  .put(protect, adminOnly, tenantGuard({ model: LiveClass, idParam: 'id' }), updateLiveClass)
  .delete(protect, adminOnly, tenantGuard({ model: LiveClass, idParam: 'id' }), deleteLiveClass);

// Student join class
router.route('/:id/join')
  .post(protect, joinLiveClass);

export default router;
