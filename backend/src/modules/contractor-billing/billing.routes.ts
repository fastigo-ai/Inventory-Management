import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
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
router.post('/invoices', requireRole(['Admin', 'Site Manager', 'Contractor']), createInvoice);

router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.put('/invoices/:id', requireRole(['Admin', 'Site Manager', 'Contractor']), updateInvoice);
router.patch('/invoices/:id/status', requireRole(['Admin', 'Site Manager', 'Project Manager', 'Project Director', 'HO Billing']), updateInvoiceStatus);

// Handover Certificate Routes
router.post('/handover-certificates', requireRole(['Admin', 'Site Manager']), createHandoverCertificate);
router.get('/handover-certificates', getHandoverCertificates);
router.get('/handover-certificates/:id', getHandoverCertificateById);
router.put('/handover-certificates/:id', requireRole(['Admin', 'Site Manager']), updateHandoverCertificate);

export default router;
