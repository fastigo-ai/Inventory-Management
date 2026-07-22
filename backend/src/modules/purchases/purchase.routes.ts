import { Router } from 'express';
import multer from 'multer';
import { createPurchaseOrder, getPurchaseOrders, getPurchaseOrderById, exportPurchaseOrders, importPurchaseOrders, getNextPurchaseOrderNumber, updatePurchaseOrder, deletePurchaseOrder } from './purchase.controller';
import { createPurchaseReceive, getPurchaseReceives, getPurchaseReceiveById, getNextPurchaseReceiveNumber, updatePurchaseReceive, deletePurchaseReceive, importPurchaseReceives, exportPurchaseReceives } from './pr.controller';
import { createPurchaseInvoice, getPurchaseInvoices, getPurchaseInvoiceById, getNextPurchaseInvoiceNumber, updatePurchaseInvoice, deletePurchaseInvoice, updatePurchaseInvoiceReceiptStatus, importPurchaseInvoices } from './purchaseInvoice.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

const upload = multer({ dest: 'uploads/purchases/' });
const uploadCsv = multer({ storage: multer.memoryStorage() });

// Apply auth middleware to all purchase routes
// router.use(authenticate);

router.post('/orders/import', uploadCsv.single('file'), importPurchaseOrders);
router.get('/orders/export', exportPurchaseOrders);
router.get('/orders/next-number', getNextPurchaseOrderNumber);
router.post('/orders', upload.array('files', 10), createPurchaseOrder);
router.get('/orders', getPurchaseOrders);
router.get('/orders/:id', getPurchaseOrderById);
router.put('/orders/:id', upload.array('files', 10), updatePurchaseOrder);
router.delete('/orders/:id', deletePurchaseOrder);

router.post('/receives/import', uploadCsv.single('file'), importPurchaseReceives);
router.get('/receives/export', exportPurchaseReceives);
router.get('/receives/next-number', getNextPurchaseReceiveNumber);
router.post('/receives', createPurchaseReceive);
router.get('/receives', getPurchaseReceives);
router.get('/receives/:id', getPurchaseReceiveById);
router.put('/receives/:id', updatePurchaseReceive);
router.delete('/receives/:id', deletePurchaseReceive);

router.post('/invoices/import', uploadCsv.single('file'), importPurchaseInvoices);
router.get('/invoices/next-number', getNextPurchaseInvoiceNumber);
router.post('/invoices', upload.array('files', 10), createPurchaseInvoice);
router.get('/invoices', getPurchaseInvoices);
router.get('/invoices/:id', getPurchaseInvoiceById);
router.put('/invoices/:id/receipt-status', updatePurchaseInvoiceReceiptStatus);
router.put('/invoices/:id', upload.array('files', 10), updatePurchaseInvoice);
router.delete('/invoices/:id', deletePurchaseInvoice);

export default router;
