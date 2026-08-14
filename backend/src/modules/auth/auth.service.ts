import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users } from '../../db/schema.js';
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

export function signToken(userId: string, username: string): string {
  const options: jwt.SignOptions = { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign({ userId, username }, env.jwtSecret, options);
}

export async function createUser(username: string, plainPassword: string) {
  const passwordHash = await hashPassword(plainPassword);
  const [user] = await db.insert(users).values({ username, passwordHash }).returning();
  return user;
}
