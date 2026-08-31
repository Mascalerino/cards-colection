import { app } from './app.js';
import { env } from './config/env.js';
import { ensureBootstrapAdmin } from './modules/auth/auth.service.js';

ensureBootstrapAdmin()
  .catch((error) => {
    console.error('Error creando el usuario administrador inicial:', error);
  })
  .finally(() => {
    app.listen(env.port, () => {
      console.log(`Backend escuchando en el puerto ${env.port}`);
    });
  });
