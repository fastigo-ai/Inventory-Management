import { Router } from 'express';
import { getGstDetails } from './integrations.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/gst/:gstin', getGstDetails);

export default router;
