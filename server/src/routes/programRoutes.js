import express from 'express';
import { getPrograms, getProgramById, getProgramBySlug, createProgram, updateProgram, deleteProgram, bulkUpdatePrograms } from '../controllers/programController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Program } from '../models/Program.js';

const router = express.Router();

router.route('/')
  .get(protect, getPrograms)
  .post(protect, adminOnly, createProgram);

router.post('/bulk', protect, adminOnly, bulkUpdatePrograms);

router.get('/slug/:slug', protect, getProgramBySlug);

router.route('/:id')
  .get(protect, tenantGuard({ model: Program, idParam: 'id' }), getProgramById)
  .put(protect, adminOnly, tenantGuard({ model: Program, idParam: 'id' }), updateProgram)
  .delete(protect, adminOnly, tenantGuard({ model: Program, idParam: 'id' }), deleteProgram);

export default router;
