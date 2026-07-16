import { Router } from 'express';
import { createLocation, getLocations, updateLocation, deleteLocation } from './location.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createLocation);
router.get('/', getLocations);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

export default router;
