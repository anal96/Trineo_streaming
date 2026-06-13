import express from 'express';
import { 
  purchaseCourse, 
  getPurchasedCourses, 
  purchaseCourseManual, 
  getPendingPayments, 
  verifyManualPayment,
  adminAssignCourse,
  adminRemoveCourse,
  adminBulkEnroll
} from '../controllers/purchaseController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Course } from '../models/Course.js';

const router = express.Router();

router.post('/checkout', protect, tenantGuard({ model: Course, bodyParam: 'courseId' }), purchaseCourse);
router.post('/manual-checkout', protect, tenantGuard({ model: Course, bodyParam: 'courseId' }), purchaseCourseManual);
router.get('/pending-payments', protect, getPendingPayments);
router.post('/verify-payment', protect, verifyManualPayment);
router.get('/my-courses', protect, getPurchasedCourses);
router.post('/admin/assign-course', protect, adminOnly, tenantGuard({ model: Course, bodyParam: 'courseId' }), adminAssignCourse);
router.post('/admin/remove-course', protect, adminOnly, tenantGuard({ model: Course, bodyParam: 'courseId' }), adminRemoveCourse);
router.post('/admin/bulk-enroll', protect, adminOnly, tenantGuard({ model: Course, bodyParam: 'courseId' }), adminBulkEnroll);

export default router;
