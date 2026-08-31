import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
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
 * Crea el usuario administrador inicial a partir de ADMIN_USER/ADMIN_PASSWORD
 * si no existe todavía. Pensado para arrancar el contenedor sin tener que ejecutar
 * `create-user` a mano. No hace nada si ADMIN_USER no está definido o si ese
 * usuario ya existe (nunca sobrescribe la contraseña de una cuenta existente).
 *
 * Si ADMIN_PASSWORD se deja vacío, se genera una contraseña aleatoria y se
 * imprime UNA sola vez en el log del contenedor (no se guarda en ningún sitio).
 */
export async function ensureBootstrapAdmin() {
  const { adminUsername, adminPassword } = env;
  if (!adminUsername) return;

  const existing = await findUserByUsername(adminUsername);
  if (existing) return;

  const generated = !adminPassword;
  const password = adminPassword || crypto.randomBytes(9).toString('base64url');

  await createUser(adminUsername, password, 'admin');

  if (generated) {
    console.log('='.repeat(64));
    console.log(`Usuario administrador creado: ${adminUsername}`);
    console.log(`Contraseña generada automáticamente: ${password}`);
    console.log('Guárdala ahora: no se volverá a mostrar ni se guarda en ningún sitio.');
    console.log('='.repeat(64));
  } else {
    console.log(`Usuario administrador "${adminUsername}" creado a partir de ADMIN_USER/ADMIN_PASSWORD.`);
  }
}
