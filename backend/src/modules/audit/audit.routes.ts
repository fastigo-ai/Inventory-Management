import { Router } from 'express';
import { getAuditLogs, trackEvent, getAuditSettings, updateAuditSettings } from './audit.controller';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Settings routes - Admin only
router.get('/settings', requireRole(['Admin', 'Super Admin']), getAuditSettings);
router.put('/settings/:entityName', requireRole(['Admin', 'Super Admin']), updateAuditSettings);

// General audit routes
router.get('/', getAuditLogs);
router.post('/track', trackEvent);

export default router;
