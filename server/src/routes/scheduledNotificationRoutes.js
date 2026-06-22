import express from 'express';
import {
  createScheduledNotification,
  getScheduledNotifications
} from '../controllers/scheduledNotificationController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .post(protect, adminOnly, createScheduledNotification)
  .get(protect, adminOnly, getScheduledNotifications);

export default router;
