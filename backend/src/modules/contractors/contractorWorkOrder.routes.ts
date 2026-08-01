import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { createWorkOrder, getWorkOrders, getWorkOrderById, bulkImportWorkOrders, updateWorkOrderStatus } from './contractorWorkOrder.controller';

const router = Router();

router.use(authenticate);

router.post('/', createWorkOrder);
router.post('/bulk-import', bulkImportWorkOrders);
router.get('/', getWorkOrders);
router.get('/:id', getWorkOrderById);
router.patch('/:id/status', updateWorkOrderStatus);

export default router;
