import { Router } from 'express';
import { getDashboardSummary, getSitePortalDashboardSummary } from './dashboard.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate); // Ensure all dashboard routes are protected

router.get('/summary', getDashboardSummary);
router.get('/site-portal-summary', getSitePortalDashboardSummary);

export default router;
