import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { login, logout, me } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', requireAuth, me);
