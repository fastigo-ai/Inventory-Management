import { Router } from 'express';
import { login, logout, refreshAccessToken, getMe } from './auth.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshAccessToken);
router.get('/me', authenticate, getMe);

export default router;
