import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { materialUpload } from '../middleware/materialUpload.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Course } from '../models/Course.js';
import { StudyMaterial } from '../models/StudyMaterial.js';
import {
  getStudentMaterials,
  getAdminMaterials,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
  downloadStudyMaterial
} from '../controllers/materialController.js';

const router = express.Router();

router.get('/', protect, getStudentMaterials);
router.get('/admin', protect, adminOnly, getAdminMaterials);
router.post('/', protect, adminOnly, tenantGuard({ model: Course, bodyParam: 'courseId' }), materialUpload.single('file'), createStudyMaterial);
router.put('/:id', protect, adminOnly, tenantGuard({ model: StudyMaterial, idParam: 'id' }), materialUpload.single('file'), updateStudyMaterial);
router.delete('/:id', protect, adminOnly, tenantGuard({ model: StudyMaterial, idParam: 'id' }), deleteStudyMaterial);
router.get('/:id/download', protect, downloadStudyMaterial);

export default router;
