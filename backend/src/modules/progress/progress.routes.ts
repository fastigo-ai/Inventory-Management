import { Router } from 'express';
import { getProgressMetrics } from './progress.controller';

const router = Router();

router.get('/', getProgressMetrics);

export default router;
