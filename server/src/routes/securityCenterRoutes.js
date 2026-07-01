import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getSecurityCenterOverview,
  getSecuritySessions,
  getSecurityEvents,
  forceLogoutSession,
  revokeAllSessions,
  setStudentSecurityStatus,
  ignoreSecurityEvent,
  resolveSecurityEvent,
  getStudentSecurityState,
  getSessionDetails,
  blockDeviceFingerprint,
  unblockDeviceFingerprint,
  getBlockedDevicesList,
  getPlatformMetrics
} from '../controllers/securityCenterController.js';

const router = express.Router();

router.get('/overview', protect, adminOnly, getSecurityCenterOverview);
router.get('/sessions', protect, adminOnly, getSecuritySessions);
router.get('/sessions/:sessionId/details', protect, adminOnly, getSessionDetails);
router.get('/events', protect, adminOnly, getSecurityEvents);
router.get('/student/:studentId/state', protect, adminOnly, getStudentSecurityState);
router.post('/sessions/:sessionId/terminate', protect, adminOnly, forceLogoutSession);
router.post('/revoke-all', protect, adminOnly, revokeAllSessions);
router.post('/student-action', protect, adminOnly, setStudentSecurityStatus);
router.post('/events/:eventId/ignore', protect, adminOnly, ignoreSecurityEvent);
router.post('/events/:eventId/resolve', protect, adminOnly, resolveSecurityEvent);

router.get('/devices/blocked', protect, adminOnly, getBlockedDevicesList);
router.post('/devices/block', protect, adminOnly, blockDeviceFingerprint);
router.post('/devices/unblock', protect, adminOnly, unblockDeviceFingerprint);
router.get('/platform-metrics', protect, getPlatformMetrics);

export default router;
