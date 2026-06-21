import express from 'express';
import { 
  enrollInProgram, 
  getEnrollments, 
  adminAssignProgram, 
  adminRemoveProgram, 
  adminBulkEnroll 
} from '../controllers/enrollmentController.js';
import { 
  purchaseCourse, 
  purchaseCourseManual, 
  getPendingPayments, 
  verifyManualPayment,
  getStudentPayments
} from '../controllers/purchaseController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.route('/')
  .get(protect, getEnrollments)
  .post(protect, enrollInProgram);

router.get('/my-courses', protect, getEnrollments);
router.get('/my-programs', protect, getEnrollments);
router.get('/my-payments', protect, getStudentPayments);

// Student Checkout / Access Request
router.post('/checkout', protect, purchaseCourse);
router.post('/manual-checkout', protect, purchaseCourseManual);

// Admin Payment Verification
router.get('/pending-payments', protect, getPendingPayments);
router.post('/verify-payment', protect, verifyManualPayment);

// Admin Program Assignments (supporting legacy course-based UI endpoints)
router.post('/assign', protect, adminOnly, adminAssignProgram);
router.post('/remove', protect, adminOnly, adminRemoveProgram);
router.post('/bulk', protect, adminOnly, adminBulkEnroll);

router.post('/admin/assign-course', protect, adminOnly, adminAssignProgram);
router.post('/admin/remove-course', protect, adminOnly, adminRemoveProgram);
router.post('/admin/bulk-enroll', protect, adminOnly, adminBulkEnroll);

export default router;
