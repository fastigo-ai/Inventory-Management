import { Router } from 'express';
import { getMetadataByEntity, updateMetadata } from './metadata.controller';
import { authenticate, authorize } from '../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/:entityName', getMetadataByEntity);
// TODO: Replace 'Admin' string with an actual permission constant or wildcard setup. For now this uses the wildcard bypass built in authorize.
router.put('/:entityName', authorize(['UpdateMetadata']), updateMetadata); 

export default router;
