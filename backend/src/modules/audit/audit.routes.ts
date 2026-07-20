import { Router } from 'express';
import { getAuditLogs } from './audit.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getAuditLogs);

export default router;
