import { Router } from 'express';
import { login, logout, refreshAccessToken, getMe } from './auth.controller';
import { authenticate } from '../../core/middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to the application
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 */
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshAccessToken);
router.get('/me', authenticate, getMe);

export default router;
