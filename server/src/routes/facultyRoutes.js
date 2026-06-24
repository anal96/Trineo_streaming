import express from 'express';
import {
  getFacultyList,
  createFaculty,
  updateFaculty,
  deleteFaculty
} from '../controllers/facultyController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Faculty } from '../models/Faculty.js';

const router = express.Router();

// GET all faculty (admin + student can both use this)
router.get('/', protect, getFacultyList);

// POST create faculty (admin only)
router.post('/', protect, adminOnly, createFaculty);

// PUT update faculty (admin only, tenant-guarded)
router.put('/:id', protect, adminOnly, tenantGuard({ model: Faculty, idParam: 'id' }), updateFaculty);

// DELETE faculty (admin only, tenant-guarded)
router.delete('/:id', protect, adminOnly, tenantGuard({ model: Faculty, idParam: 'id' }), deleteFaculty);

export default router;
