import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getStudents,
  getStudentAccessRules,
  updateStudentAccessRule,
  editStudentAccessRuleById,
  deleteStudentAccessRule,
  getAccessPackages,
  createAccessPackage,
  updateAccessPackage,
  deleteAccessPackage,
  assignPackageToStudent,
  getBatchAccessRules,
  updateBatchAccessRule,
  editBatchAccessRuleById,
  deleteBatchAccessRule,
  getCurriculumMeta,
  getAccessAnalytics
} from '../controllers/accessController.js';

const router = express.Router();

// Register protect middleware on all access manager routes
router.use(protect);

// Student listing & specific student overrides
router.get('/students', getStudents);
router.get('/student/:studentId', getStudentAccessRules);
router.post('/student', updateStudentAccessRule);
router.put('/student/:id', editStudentAccessRuleById);
router.delete('/student/:id', deleteStudentAccessRule);
router.post('/student/:studentId/assign-package', assignPackageToStudent);

// Access packages CRUD
router.get('/packages', getAccessPackages);
router.post('/packages', createAccessPackage);
router.put('/packages/:id', updateAccessPackage);
router.delete('/packages/:id', deleteAccessPackage);

// Batch Rules CRUD
router.get('/batches', getBatchAccessRules);
router.post('/batches', updateBatchAccessRule);
router.put('/batches/:id', editBatchAccessRuleById);
router.delete('/batches/:id', deleteBatchAccessRule);

// Distinct curriculum items selector helper
router.get('/curriculum-meta/:courseId', getCurriculumMeta);

// Analytics
router.get('/analytics', getAccessAnalytics);

export default router;
