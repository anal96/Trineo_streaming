import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { materialUpload } from '../middleware/materialUpload.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Course } from '../models/Course.js';
import { Program } from '../models/Program.js';
import { StudyMaterial } from '../models/StudyMaterial.js';
import {
  getStudentMaterials,
  getAdminMaterials,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
  downloadStudyMaterial,
  generateDownloadToken
} from '../controllers/materialController.js';

const router = express.Router();

router.get('/', protect, getStudentMaterials);
router.get('/token', protect, generateDownloadToken);
router.get('/admin', protect, adminOnly, getAdminMaterials);
router.post(
  '/',
  protect,
  adminOnly,
  tenantGuard({
    resolveResource: async (req, courseId) => {
      let resource = await Course.findById(courseId).select('institute');
      if (!resource) {
        resource = await Program.findById(courseId).select('institute');
      }
      return resource;
    },
    bodyParam: 'courseId'
  }),
  materialUpload.single('file'),
  createStudyMaterial
);
router.put('/:id', protect, adminOnly, tenantGuard({ model: StudyMaterial, idParam: 'id' }), materialUpload.single('file'), updateStudyMaterial);
router.delete('/:id', protect, adminOnly, tenantGuard({ model: StudyMaterial, idParam: 'id' }), deleteStudyMaterial);
router.get('/:id/download', protect, downloadStudyMaterial);

export default router;
