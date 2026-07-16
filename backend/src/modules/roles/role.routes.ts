import { Router } from 'express';
import { createRole, getRoles, updateRole, deleteRole } from './role.controller';
import { authenticate, authorize } from '../../core/middlewares/auth.middleware';

const router = Router();

// Protect all role routes - only users with 'roles:manage' permission can access
router.use(authenticate);
router.use(authorize(['roles:manage']));

router.route('/')
  .post(createRole)
  .get(getRoles);

router.route('/:id')
  .put(updateRole)
  .delete(deleteRole);

export default router;
