import express from 'express';
import {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  trackDelivery,
  trackClick,
  testPush
} from '../controllers/pushSubscriptionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', protect, subscribePush);
router.post('/unsubscribe', protect, unsubscribePush);
router.post('/track-delivery', protect, trackDelivery);
router.post('/track-click', protect, trackClick);
router.post('/test-push', protect, testPush);

export default router;
