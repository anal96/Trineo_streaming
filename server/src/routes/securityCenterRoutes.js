import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getSecurityCenterOverview,
  getSecuritySessions,
  getSecurityEvents,
  forceLogoutSession,
  revokeAllSessions,
  setStudentSecurityStatus
} from '../controllers/securityCenterController.js';

const router = express.Router();

router.get('/overview', protect, adminOnly, getSecurityCenterOverview);
router.get('/sessions', protect, adminOnly, getSecuritySessions);
router.get('/events', protect, adminOnly, getSecurityEvents);
router.post('/sessions/:sessionId/terminate', protect, adminOnly, forceLogoutSession);
router.post('/revoke-all', protect, adminOnly, revokeAllSessions);
router.post('/student-action', protect, adminOnly, setStudentSecurityStatus);

export default router;
