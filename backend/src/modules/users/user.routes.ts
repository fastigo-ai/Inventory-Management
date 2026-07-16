import { Router } from 'express';
import { createUser, getUsers, updateUserRole } from './user.controller';
import { authenticate, authorize } from '../../core/middlewares/auth.middleware';

const router = Router();

// Protect all user routes - only users with 'users:manage' permission can access
router.use(authenticate);
router.use(authorize(['users:manage']));

router.route('/')
  .post(createUser)
  .get(getUsers);

router.route('/:id/role')
  .put(updateUserRole);

export default router;
