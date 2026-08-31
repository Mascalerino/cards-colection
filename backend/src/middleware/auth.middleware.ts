import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../db/schema.js';

export interface AuthPayload {
  userId: string;
  username: string;
  role: UserRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    username?: string;
    role?: UserRole;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[env.cookieName];

  if (!token) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.userId = payload.userId;
    req.username = payload.username;
    req.role = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o caducada' });
  }
}

/** Debe ir siempre después de requireAuth. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.role !== 'admin') {
    res.status(403).json({ error: 'Requiere permisos de administrador' });
    return;
  }
  next();
}
