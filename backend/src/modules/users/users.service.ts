import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, type UserRole } from '../../db/schema.js';
import { createUser, findUserByUsername } from '../auth/auth.service.js';
import { HttpError } from '../../utils/http-error.js';

export async function listUsers() {
  return db
    .select({ id: users.id, username: users.username, role: users.role, createdAt: users.createdAt })
    .from(users)
    .orderBy(users.createdAt);
}

export async function createUserAsAdmin(username: string, password: string, role: UserRole) {
  const existing = await findUserByUsername(username);
  if (existing) {
    throw new HttpError(409, `El usuario "${username}" ya existe`);
  }
  const user = await createUser(username, password, role);
  return { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt };
}

export async function updateUserRole(userId: string, role: UserRole, requestingUserId: string) {
  if (userId === requestingUserId) {
    throw new HttpError(400, 'No puedes cambiar tu propio rol');
  }

  const [user] = await db.update(users).set({ role }).where(eq(users.id, userId)).returning();
  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }
  return { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt };
}

export async function deleteUser(userId: string, requestingUserId: string) {
  if (userId === requestingUserId) {
    throw new HttpError(400, 'No puedes eliminar tu propia cuenta');
  }

  const [deleted] = await db.delete(users).where(eq(users.id, userId)).returning();
  if (!deleted) {
    throw new HttpError(404, 'Usuario no encontrado');
  }
}
