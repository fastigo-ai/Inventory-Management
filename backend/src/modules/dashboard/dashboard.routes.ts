import { Router } from 'express';
import { getDashboardSummary, getSitePortalDashboardSummary, getPMPortalDashboardSummary, getPDPortalDashboardSummary, getCeoDashboardSummary, getCeoDashboardV2Summary } from './dashboard.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate); // Ensure all dashboard routes are protected

router.get('/summary', getDashboardSummary);
router.get('/site-portal-summary', getSitePortalDashboardSummary);
router.get('/pm-portal-summary', getPMPortalDashboardSummary);
router.get('/pd-portal-summary', getPDPortalDashboardSummary);
router.get('/ceo-portal-summary', getCeoDashboardSummary);
router.get('/ceo-portal-v2-summary', getCeoDashboardV2Summary);

export default router;
