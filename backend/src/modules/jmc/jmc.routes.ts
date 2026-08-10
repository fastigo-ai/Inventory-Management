import { Router } from 'express';
import { protect, restrictTo } from '../../core/middleware/auth.middleware';
import {
  createJmc,
  getJmcs,
  getJmcById,
  updateJmc,
  deleteJmc
} from './jmc.controller';

const router = Router();

router.use(protect);

router.route('/')
  .get(getJmcs)
  .post(restrictTo('Admin', 'Site Manager', 'Contractor'), createJmc);

router.route('/:id')
  .get(getJmcById)
  .put(restrictTo('Admin', 'Site Manager', 'Contractor'), updateJmc)
  .delete(restrictTo('Admin'), deleteJmc);

export default router;
