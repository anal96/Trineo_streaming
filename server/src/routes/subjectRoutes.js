import express from 'express';
import { getSubjects, getSubjectById, createSubject, updateSubject, deleteSubject, bulkUpdateSubjects } from '../controllers/subjectController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Subject } from '../models/Subject.js';

const router = express.Router();

router.route('/')
  .get(protect, getSubjects)
  .post(protect, adminOnly, createSubject);

router.post('/bulk', protect, adminOnly, bulkUpdateSubjects);

router.route('/:id')
  .get(protect, tenantGuard({ model: Subject, idParam: 'id' }), getSubjectById)
  .put(protect, adminOnly, tenantGuard({ model: Subject, idParam: 'id' }), updateSubject)
  .delete(protect, adminOnly, tenantGuard({ model: Subject, idParam: 'id' }), deleteSubject);

export default router;
