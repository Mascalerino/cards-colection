import type { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { findUserById, signToken, verifyCredentials } from './auth.service.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
};

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    return;
  }

  const { username, password } = parsed.data;
  const user = await verifyCredentials(username, password);

  if (!user) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    return;
  }

  const token = signToken(user.id, user.username);
  res.cookie(env.cookieName, token, cookieOptions);
  res.json({ id: user.id, username: user.username });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(env.cookieName);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  if (!req.userId) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  const user = await findUserById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  res.json({ id: user.id, username: user.username });
}
