import { Router } from 'express';
import multer from 'multer';
import { createItem, getItems, exportItems, importItems, getItemById, getItemUsage, bulkDeleteItems } from './item.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const upload = multer({ storage: multer.memoryStorage() });

import Metadata from '../metadata/metadata.model';

const router = Router();
router.get('/debug-metadata', async (req, res) => {
  try {
    const meta = await Metadata.findOne({ entityName: 'Vendor' });
    res.json(meta);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});



router.use(authenticate);

router.post('/', createItem);
router.get('/', getItems);
router.get('/export', exportItems);
router.post('/bulk-delete', bulkDeleteItems);
router.post('/import', upload.single('file'), importItems);
router.get('/:id/usage', getItemUsage);
router.get('/:id', getItemById);

export default router;
