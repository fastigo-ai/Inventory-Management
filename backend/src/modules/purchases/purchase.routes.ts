import { Router } from 'express';
import multer from 'multer';
import { createPurchaseOrder, getPurchaseOrders, getPurchaseOrderById, exportPurchaseOrders, importPurchaseOrders, getNextPurchaseOrderNumber, updatePurchaseOrder, deletePurchaseOrder } from './purchase.controller';
import { createPurchaseInvoice, getPurchaseInvoices, getPurchaseInvoiceById, getNextPurchaseInvoiceNumber, updatePurchaseInvoice, deletePurchaseInvoice, importPurchaseInvoices, exportPurchaseInvoices } from './purchaseInvoice.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

const upload = multer({ dest: 'uploads/purchases/' });
const uploadCsv = multer({ storage: multer.memoryStorage() });

// Apply auth middleware to all purchase routes
router.use(authenticate);

router.post('/orders/import', uploadCsv.single('file'), importPurchaseOrders);
router.get('/orders/export', exportPurchaseOrders);
router.get('/orders/next-number', getNextPurchaseOrderNumber);
router.post('/orders', upload.array('files', 10), createPurchaseOrder);
router.get('/orders', getPurchaseOrders);
router.get('/orders/:id', getPurchaseOrderById);
router.put('/orders/:id', upload.array('files', 10), updatePurchaseOrder);
router.delete('/orders/:id', deletePurchaseOrder);

router.post('/invoices/import', uploadCsv.single('file'), importPurchaseInvoices);
router.get('/invoices/export', exportPurchaseInvoices);
router.get('/invoices/next-number', getNextPurchaseInvoiceNumber);
router.post('/invoices', createPurchaseInvoice);
router.get('/invoices', getPurchaseInvoices);
router.get('/invoices/:id', getPurchaseInvoiceById);
router.put('/invoices/:id', updatePurchaseInvoice);
router.delete('/invoices/:id', deletePurchaseInvoice);

export default router;
