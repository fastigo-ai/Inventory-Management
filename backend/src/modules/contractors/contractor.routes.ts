import { Router } from 'express';
import { authenticate } from '../../core/middlewares/auth.middleware';
import { getContractors, createContractor, getAssignments, createAssignment } from './contractor.controller';

const router = Router();

router.use(authenticate);

router.route('/')
  .get(getContractors)
  .post(createContractor);

router.route('/assignments')
  .get(getAssignments)
  .post(createAssignment);

export default router;
