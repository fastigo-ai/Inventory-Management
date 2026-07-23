import { Router } from 'express';
import { getSummaries } from './summary.controller';

const router = Router();

router.get('/item-summary', getSummaries);

export default router;
