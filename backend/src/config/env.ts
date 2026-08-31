import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  cookieName: 'cc_token',
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  // Directorio con el build estático de Angular; si está definido, el backend
  // lo sirve directamente (imagen Docker única, sin nginx por delante).
  frontendDist: process.env.FRONTEND_DIST,
};
