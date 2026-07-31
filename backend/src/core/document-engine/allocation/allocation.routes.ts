import { Router } from 'express';
import { getDocumentAllocation } from './allocation.controller';

const router = Router();

router.get('/:sourceId', getDocumentAllocation);

export default router;
