import { Router } from 'express';
import { getAuditLogs, trackEvent } from './audit.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getAuditLogs);
router.post('/track', trackEvent);

export default router;
