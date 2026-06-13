import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getStudentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteStudentNotification
} from '../controllers/studentNotificationController.js';

const router = express.Router();

router.get('/', protect, getStudentNotifications);
router.post('/:id/read', protect, markNotificationAsRead);
router.post('/mark-all-read', protect, markAllNotificationsAsRead);
router.delete('/:id', protect, deleteStudentNotification);

export default router;
