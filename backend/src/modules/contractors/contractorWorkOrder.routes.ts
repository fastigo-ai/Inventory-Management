import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { createWorkOrder, getWorkOrders, getWorkOrderById } from './contractorWorkOrder.controller';

const router = Router();

router.use(authenticate);

router.post('/', createWorkOrder);
router.get('/', getWorkOrders);
router.get('/:id', getWorkOrderById);

export default router;
