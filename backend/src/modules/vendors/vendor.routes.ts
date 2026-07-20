import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../core/middlewares/auth.middleware';
import {
  createVendor,
  getVendors,
  getVendorById,
  importVendors,
  exportVendors,
  exportVendorTemplate,
  updateVendor,
  deleteVendor
} from './vendor.controller';

const router = Router();
const uploadCsv = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.post('/import', uploadCsv.single('file'), importVendors);
router.get('/export', exportVendors);
router.get('/template', exportVendorTemplate);
router.post('/', createVendor);
router.get('/', getVendors);
router.get('/:id', getVendorById);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

export default router;
