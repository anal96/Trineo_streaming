import express from 'express';
import {
  getAdminOverview,
  updateStudentStatus,
  createStudent,
  updateStudent,
  deleteStudent,
  createAnnouncement,
  getAnnouncements,
  estimateAnnouncementRecipients,
  updateInstituteBranding,
  resendWelcomeEmail,
  resetStudentPassword,
  getBillingInfo
} from '../controllers/analyticsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/overview', protect, adminOnly, getAdminOverview);
router.get('/billing', protect, adminOnly, getBillingInfo);
router.post('/student-status', protect, adminOnly, updateStudentStatus);
router.post('/students', protect, adminOnly, createStudent);
router.put('/students/:id', protect, adminOnly, updateStudent);
router.delete('/students/:id', protect, adminOnly, deleteStudent);
router.post('/students/:id/resend-welcome', protect, adminOnly, resendWelcomeEmail);
router.post('/students/:id/reset-password', protect, adminOnly, resetStudentPassword);

// Announcements & Branding
router.post('/announcement', protect, adminOnly, createAnnouncement);
router.post('/announcement/estimate', protect, adminOnly, estimateAnnouncementRecipients);
router.get('/announcements', protect, getAnnouncements);
router.put('/branding', protect, adminOnly, updateInstituteBranding);

export default router;
