import { Router } from 'express';
import multer from 'multer';
import { createItem, getItems, exportItems, importItems, getItemById } from './item.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(authenticate);

router.post('/', createItem);
router.get('/', getItems);
router.get('/export', exportItems);
router.post('/import', upload.single('file'), importItems);
router.get('/:id', getItemById);

export default router;
