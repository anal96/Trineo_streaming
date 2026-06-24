import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getInstituteInvoices,
  downloadInvoiceSecure,
  recordInvoiceViewed
} from '../controllers/ownerController.js';

const router = express.Router();

// All billing routes require authentication
router.use(protect);

router.get('/invoices', getInstituteInvoices);
router.get('/invoices/:id/download', downloadInvoiceSecure);
router.get('/invoice/:id/download', downloadInvoiceSecure);
router.post('/invoices/:id/view', recordInvoiceViewed);

export default router;
