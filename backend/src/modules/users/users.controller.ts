import type { Request, Response } from 'express';
import { z } from 'zod';
import { createUserAsAdmin, deleteUser, listUsers, updateUserRole } from './users.service.js';

const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.enum(['admin', 'user']).default('user'),
});

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
});

export async function getUsers(_req: Request, res: Response) {
  const list = await listUsers();
  res.json(list);
}

export async function postUser(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos de usuario inválidos' });
    return;
  }

  const { username, password, role } = parsed.data;
  const user = await createUserAsAdmin(username, password, role);
  res.status(201).json(user);
}

export async function patchUserRole(req: Request, res: Response) {
  const parsed = updateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Rol inválido' });
    return;
  }

  const user = await updateUserRole(req.params.userId, parsed.data.role, req.userId!);
  res.json(user);
}

export async function removeUser(req: Request, res: Response) {
  await deleteUser(req.params.userId, req.userId!);
  res.status(204).send();
}
