import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';
import {
  createStage1Invoice,
  createStage2Invoice,
  createStage3Invoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  getBillingAnalytics
} from './billing.controller';
import {
  createHandoverCertificate,
  getHandoverCertificates,
  getHandoverCertificateById,
  updateHandoverCertificate
} from './handoverCertificate.controller';

const router = Router();

router.use(authenticate);

// Billing Routes
router.get('/analytics', getBillingAnalytics);
router.post('/invoices/stage1', requireRole(['Admin', 'Site Manager', 'Contractor']), createStage1Invoice);
router.post('/invoices/stage2', requireRole(['Admin', 'Site Manager', 'Contractor']), createStage2Invoice);
router.post('/invoices/stage3', requireRole(['Admin', 'Site Manager', 'Contractor']), createStage3Invoice);

router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.patch('/invoices/:id/status', requireRole(['Admin', 'Site Manager']), updateInvoiceStatus);

// Handover Certificate Routes
router.post('/handover-certificates', requireRole(['Admin', 'Site Manager']), createHandoverCertificate);
router.get('/handover-certificates', getHandoverCertificates);
router.get('/handover-certificates/:id', getHandoverCertificateById);
router.put('/handover-certificates/:id', requireRole(['Admin', 'Site Manager']), updateHandoverCertificate);

export default router;
