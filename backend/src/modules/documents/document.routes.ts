import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, getDocuments, deleteDocument } from './document.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All document routes should be authenticated
router.use(authenticate);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.delete('/:id', deleteDocument);

export default router;
