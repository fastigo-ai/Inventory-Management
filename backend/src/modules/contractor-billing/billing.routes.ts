import { Router } from 'express';
import { protect, restrictTo } from '../../core/middlewares/auth.middleware';
import {
  createStage1Invoice,
  createStage2Invoice,
  createStage3Invoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus
} from './billing.controller';
import {
  createHandoverCertificate,
  getHandoverCertificates,
  getHandoverCertificateById,
  updateHandoverCertificate
} from './handoverCertificate.controller';

const router = Router();

router.use(protect);

// Billing Routes
router.post('/invoices/stage1', restrictTo('Admin', 'Site Manager', 'Contractor'), createStage1Invoice);
router.post('/invoices/stage2', restrictTo('Admin', 'Site Manager', 'Contractor'), createStage2Invoice);
router.post('/invoices/stage3', restrictTo('Admin', 'Site Manager', 'Contractor'), createStage3Invoice);

router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.patch('/invoices/:id/status', restrictTo('Admin', 'Site Manager'), updateInvoiceStatus);

// Handover Certificate Routes
router.post('/handover-certificates', restrictTo('Admin', 'Site Manager'), createHandoverCertificate);
router.get('/handover-certificates', getHandoverCertificates);
router.get('/handover-certificates/:id', getHandoverCertificateById);
router.put('/handover-certificates/:id', restrictTo('Admin', 'Site Manager'), updateHandoverCertificate);

export default router;
