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
  terminateOtherStudentSessions,
  uploadStudentAvatar,
  deleteStudentAvatar
} from '../controllers/studentAccountController.js';

const router = express.Router();

router.post('/password/request-reset', requestPasswordReset);
router.get('/password/validate/:token', validateResetToken);
router.post('/password/reset', resetPasswordWithToken);

router.get('/profile', protect, getStudentProfileSettings);
router.put('/profile', protect, updateStudentProfileSettings);
router.put('/profile/avatar', protect, uploadStudentAvatar);
router.delete('/profile/avatar', protect, deleteStudentAvatar);
router.post('/password/change', protect, changeStudentPassword);

router.get('/sessions', protect, getStudentSessions);
router.post('/sessions/:sessionId/terminate', protect, terminateStudentSession);
router.post('/sessions/terminate-others', protect, terminateOtherStudentSessions);

export default router;
