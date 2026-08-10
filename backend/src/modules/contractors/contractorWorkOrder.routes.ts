import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { createWorkOrder, getWorkOrders, getWorkOrderById, bulkImportWorkOrders, updateWorkOrderStatus, updateWorkOrder, deleteWorkOrder } from './contractorWorkOrder.controller';

const router = Router();

router.use(authenticate);

router.post('/', createWorkOrder);
router.post('/bulk-import', bulkImportWorkOrders);
router.get('/', getWorkOrders);
router.get('/:id', getWorkOrderById);
router.put('/:id', updateWorkOrder);
router.delete('/:id', deleteWorkOrder);
router.patch('/:id/status', updateWorkOrderStatus);

export default router;
