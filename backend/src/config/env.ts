import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

/** '' o no definida => undefined (decidir automáticamente); 'true'/'false' => forzado. */
function optionalBool(value: string | undefined): boolean | undefined {
  const v = (value ?? '').trim().toLowerCase();
  return v === '' ? undefined : v === 'true';
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  cookieName: 'cc_token',
  // Si no se define, se decide por petición según req.secure (ver auth.controller.ts):
  // así funciona igual detrás de un proxy TLS que en HTTP plano en la LAN (típico en
  // un NAS sin certificado). Ponlo a 'true'/'false' solo para forzar un valor fijo.
  cookieSecure: optionalBool(process.env.COOKIE_SECURE),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  // Directorio con el build estático de Angular; si está definido, el backend
  // lo sirve directamente (imagen Docker única, sin nginx por delante).
  frontendDist: process.env.FRONTEND_DIST,
  // Si se define, se crea este usuario como admin al arrancar (si no existe ya).
  // Permite dar de alta el primer administrador desde docker-compose sin `create-user`.
  adminUsername: process.env.ADMIN_USER,
  adminPassword: process.env.ADMIN_PASSWORD,
};
