import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, type UserRole } from '../../db/schema.js';
import { env } from '../../config/env.js';

const SALT_ROUNDS = 12;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function findUserByUsername(username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user ?? null;
}

export async function findUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user ?? null;
}

export async function verifyCredentials(username: string, plainPassword: string) {
  const user = await findUserByUsername(username);
  if (!user) return null;

  const valid = await bcrypt.compare(plainPassword, user.passwordHash);
  if (!valid) return null;

  return user;
}

export function signToken(userId: string, username: string, role: UserRole): string {
  const options: jwt.SignOptions = { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign({ userId, username, role }, env.jwtSecret, options);
}

export async function createUser(username: string, plainPassword: string, role: UserRole = 'user') {
  const passwordHash = await hashPassword(plainPassword);
  const [user] = await db.insert(users).values({ username, passwordHash, role }).returning();
  return user;
}

/**
 * Crea el usuario administrador inicial a partir de ADMIN_USERNAME/ADMIN_PASSWORD
 * si no existe todavía. Pensado para arrancar el contenedor sin tener que ejecutar
 * `create-user` a mano. No hace nada si las variables no están definidas o si el
 * usuario ya existe (nunca sobrescribe la contraseña de una cuenta existente).
 */
export async function ensureBootstrapAdmin() {
  const { adminUsername, adminPassword } = env;
  if (!adminUsername || !adminPassword) return;

  const existing = await findUserByUsername(adminUsername);
  if (existing) return;

  await createUser(adminUsername, adminPassword, 'admin');
  console.log(`Usuario administrador "${adminUsername}" creado a partir de ADMIN_USERNAME/ADMIN_PASSWORD.`);
}
