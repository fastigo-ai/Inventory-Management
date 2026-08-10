import { Router } from 'express';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware';
import {
  createJmc,
  getJmcs,
  getJmcById,
  updateJmc,
  deleteJmc
} from './jmc.controller';

const router = Router();

router.use(authenticate);

router.route('/')
  .get(getJmcs)
  .post(requireRole(['Admin', 'Site Manager', 'Contractor']), createJmc);

router.route('/:id')
  .get(getJmcById)
  .put(requireRole(['Admin', 'Site Manager', 'Contractor']), updateJmc)
  .delete(requireRole(['Admin']), deleteJmc);

export default router;
