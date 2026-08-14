import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from './env.js';
import * as schema from '../db/schema.js';

const client = postgres(env.databaseUrl);

export const db = drizzle(client, { schema });
