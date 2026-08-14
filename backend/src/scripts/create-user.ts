import { createUser, findUserByUsername } from '../modules/auth/auth.service.js';

async function main() {
  const args = process.argv.slice(2);
  const usernameIdx = args.indexOf('--username');
  const passwordIdx = args.indexOf('--password');

  const username = usernameIdx !== -1 ? args[usernameIdx + 1] : undefined;
  const password = passwordIdx !== -1 ? args[passwordIdx + 1] : undefined;

  if (!username || !password) {
    console.error('Uso: npm run create-user -- --username <usuario> --password <contraseña>');
    process.exit(1);
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    console.error(`El usuario "${username}" ya existe.`);
    process.exit(1);
  }

  const user = await createUser(username, password);
  console.log(`Usuario creado: ${user.username} (${user.id})`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Error creando usuario:', error);
  process.exit(1);
});
