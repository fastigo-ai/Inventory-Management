import { Router } from 'express';
import { getDocumentRelations } from './relations.controller';

const router = Router();

router.get('/:documentId', getDocumentRelations);

export default router;
