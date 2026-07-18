import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { createDI, getDIs, getDIById, updateDIStatus, receiveDI } from './di.controller';

const router = Router();

router.use(authenticate);

router.route('/')
  .post(createDI)
  .get(getDIs);

router.route('/:id')
  .get(getDIById);

router.route('/:id/status')
  .patch(updateDIStatus);

router.route('/:id/receive')
  .post(receiveDI);

export default router;
