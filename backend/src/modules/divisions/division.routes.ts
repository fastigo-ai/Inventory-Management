import { Router } from 'express';
import { getDivisions, createDivision } from './division.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.route('/')
  .get(getDivisions)
  .post(createDivision);

export default router;
