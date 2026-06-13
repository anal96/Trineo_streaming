import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getStudentProfileSettings,
  updateStudentProfileSettings,
  changeStudentPassword,
  requestPasswordReset,
  validateResetToken,
  resetPasswordWithToken,
  getStudentSessions,
  terminateStudentSession,
  terminateOtherStudentSessions
} from '../controllers/studentAccountController.js';

const router = express.Router();

router.post('/password/request-reset', requestPasswordReset);
router.get('/password/validate/:token', validateResetToken);
router.post('/password/reset', resetPasswordWithToken);

router.get('/profile', protect, getStudentProfileSettings);
router.put('/profile', protect, updateStudentProfileSettings);
router.post('/password/change', protect, changeStudentPassword);

router.get('/sessions', protect, getStudentSessions);
router.post('/sessions/:sessionId/terminate', protect, terminateStudentSession);
router.post('/sessions/terminate-others', protect, terminateOtherStudentSessions);

export default router;
