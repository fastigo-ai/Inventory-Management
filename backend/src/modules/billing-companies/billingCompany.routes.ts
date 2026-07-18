import { Router } from 'express';
import multer from 'multer';
import { createBillingCompany, getBillingCompanies, updateBillingCompany, deleteBillingCompany } from './billingCompany.controller';

const router = Router();

// We use memory storage to buffer the file and stream it to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('logo'), createBillingCompany);
router.get('/', getBillingCompanies);
router.put('/:id', upload.single('logo'), updateBillingCompany);
router.delete('/:id', deleteBillingCompany);

export default router;
