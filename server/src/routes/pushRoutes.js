import express from 'express';
import { registerFCM } from '../controllers/pushController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Register/update FCM token (requires authentication)
router.post('/fcm/register', protect, registerFCM);

export default router;
