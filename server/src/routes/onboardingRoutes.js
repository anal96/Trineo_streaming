import express from 'express';
import { registerInstitute, getActivePlans } from '../controllers/onboardingController.js';

const router = express.Router();

// Public onboarding routes
router.post('/register', registerInstitute);
router.get('/plans', getActivePlans);

export default router;
