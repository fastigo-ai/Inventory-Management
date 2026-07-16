import { Router } from 'express';
import { createItem, getItems } from './item.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createItem);
router.get('/', getItems);

export default router;
