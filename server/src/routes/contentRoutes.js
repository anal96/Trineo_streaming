import express from 'express';
import { getContent, getContentById, createContent, updateContent, deleteContent, reorderContent } from '../controllers/contentController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { Content } from '../models/Content.js';

const router = express.Router();

router.route('/')
  .get(protect, getContent)
  .post(protect, adminOnly, createContent);

router.post('/reorder', protect, adminOnly, reorderContent);

router.route('/:id')
  .get(protect, tenantGuard({ model: Content, idParam: 'id' }), getContentById)
  .put(protect, adminOnly, tenantGuard({ model: Content, idParam: 'id' }), updateContent)
  .delete(protect, adminOnly, tenantGuard({ model: Content, idParam: 'id' }), deleteContent);

export default router;
