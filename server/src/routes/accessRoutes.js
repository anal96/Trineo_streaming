import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getStudents,
  editStudentAccessRuleById,
  bulkToggleAccess,
  bulkSetExpiry,
  bulkExtendExpiry,
  getAccessAnalytics,
  getStudentRestrictions,
  toggleStudentRestriction,
  applyQuickAction,
  bulkToggleRestriction,
  bulkQuickAction,
  getBatchHierarchy,
  getStudentAccessRules
} from '../controllers/accessController.js';

const router = express.Router();

// Register protect middleware on all access manager routes
router.use(protect);

// Student listing & individual update
router.get('/students', getStudents);
router.put('/student/:id', editStudentAccessRuleById);
router.get('/student/:studentId', getStudentAccessRules);

// Student specific detailed content restrictions
router.get('/student/:studentId/restrictions', getStudentRestrictions);
router.post('/student/:studentId/restrictions/toggle', toggleStudentRestriction);
router.post('/student/:studentId/restrictions/quick-action', applyQuickAction);

// Bulk operations
router.post('/bulk/toggle-access', bulkToggleAccess);
router.post('/bulk/set-expiry', bulkSetExpiry);
router.post('/bulk/extend-expiry', bulkExtendExpiry);

// Bulk content restriction operations
router.post('/bulk/restrictions/toggle', bulkToggleRestriction);
router.post('/bulk/restrictions/quick-action', bulkQuickAction);
router.get('/batch/:batchName/hierarchy', getBatchHierarchy);

// Analytics
router.get('/analytics', getAccessAnalytics);

export default router;

