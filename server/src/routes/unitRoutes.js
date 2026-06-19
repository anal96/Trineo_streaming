import express from 'express';
import { getUnits, getUnitById, createUnit, updateUnit, deleteUnit, bulkUpdateUnits } from '../controllers/unitController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Unit } from '../models/Unit.js';

const router = express.Router();

router.route('/')
  .get(protect, getUnits)
  .post(protect, adminOnly, createUnit);

router.post('/bulk', protect, adminOnly, bulkUpdateUnits);

router.route('/:id')
  .get(protect, tenantGuard({ model: Unit, idParam: 'id' }), getUnitById)
  .put(protect, adminOnly, tenantGuard({ model: Unit, idParam: 'id' }), updateUnit)
  .delete(protect, adminOnly, tenantGuard({ model: Unit, idParam: 'id' }), deleteUnit);

export default router;
