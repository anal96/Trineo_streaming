import express from 'express';
import {
  getAdminOverview,
  updateStudentStatus,
  createStudent,
  updateStudent,
  deleteStudent,
  createAnnouncement,
  getAnnouncements,
  updateInstituteBranding
} from '../controllers/analyticsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', protect, adminOnly, getAdminOverview);
router.post('/student-status', protect, adminOnly, updateStudentStatus);
router.post('/students', protect, adminOnly, createStudent);
router.put('/students/:id', protect, adminOnly, updateStudent);
router.delete('/students/:id', protect, adminOnly, deleteStudent);

// Announcements & Branding
router.post('/announcement', protect, adminOnly, createAnnouncement);
router.get('/announcements', protect, getAnnouncements);
router.put('/branding', protect, adminOnly, updateInstituteBranding);

export default router;
