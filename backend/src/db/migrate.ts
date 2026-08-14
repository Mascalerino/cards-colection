import { fileURLToPath } from 'node:url';
import path from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { env } from '../config/env.js';

// Relativo al propio módulo: funciona igual en dev (tsx, src/db/) que compilado (dist/db/),
// ya que la carpeta migrations siempre es hermana de este archivo en ambos casos.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, 'migrations');

async function main() {
  const client = postgres(env.databaseUrl, { max: 1 });
  const db = drizzle(client);

  console.log('Aplicando migraciones...');
  await migrate(db, { migrationsFolder });
  console.log('Migraciones aplicadas correctamente.');

  await client.end();
}

main().catch((error) => {
  console.error('Error aplicando migraciones:', error);
  process.exit(1);
});
