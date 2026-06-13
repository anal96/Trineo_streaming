import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyApiKey } from '../middleware/verifyApiKey.js';
import {
  syncStudent,
  assignCourse,
  unassignCourse,
  getStudentAccess,
  checkIntegrationHealth
} from '../controllers/integrationController.js';

const integrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each API key / IP to 200 requests per window
  message: { message: 'Too many requests from this client, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip
});

const router = express.Router();

// Protect all CRM integration routes
router.use(verifyApiKey);
router.use(integrationLimiter);

router.get('/health', checkIntegrationHealth);
router.post('/students', syncStudent);
router.post('/course-assignments', assignCourse);
router.delete('/course-assignments', unassignCourse);
router.post('/course-assignments/unassign', unassignCourse);
router.get('/student-access/:studentId', getStudentAccess);

export default router;
