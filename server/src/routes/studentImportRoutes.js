import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { studentImportUpload } from '../middleware/studentImportUpload.js';
import {
  previewStudentImport,
  confirmStudentImport,
  getStudentImportHistory,
  getImportJobDetails,
  downloadExcelTemplate
} from '../controllers/studentImportController.js';

const router = express.Router();

router.get('/template/excel', protect, adminOnly, downloadExcelTemplate);
router.post('/preview', protect, adminOnly, studentImportUpload.single('file'), previewStudentImport);
router.post('/confirm/:jobId', protect, adminOnly, confirmStudentImport);
router.get('/history', protect, adminOnly, getStudentImportHistory);
router.get('/history/:jobId', protect, adminOnly, getImportJobDetails);

export default router;
