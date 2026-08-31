import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'node:path';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { cardsRouter } from './modules/cards/cards.routes.js';
import { collectionRouter } from './modules/collection/collection.routes.js';
import { salesRouter } from './modules/sales/sales.routes.js';
import { dataTransferRouter } from './modules/data-transfer/data-transfer.routes.js';

export const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);

// Catálogo (público para usuarios autenticados de la instancia)
app.use('/api/:game/sets', requireAuth, cardsRouter);
app.use('/api/:game/collection', requireAuth, collectionRouter);
app.use('/api/magic/sales', requireAuth, salesRouter);
app.use('/api', requireAuth, dataTransferRouter);
app.use('/api', notFoundHandler);

// Frontend estático (imagen Docker única): si FRONTEND_DIST está definido,
// el backend sirve el build de Angular y hace de fallback SPA para el resto
// de rutas. En desarrollo (sin la variable) el frontend lo sirve `ng serve`.
if (env.frontendDist) {
  const indexHtml = path.join(env.frontendDist, 'index.html');

  app.use(
    express.static(env.frontendDist, {
      index: false,
      // Los assets llevan hash en el nombre; el resto (index.html incluido) no cachea.
      setHeaders(res, filePath) {
        if (/-[0-9a-z]{6,}\.(js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        }
      },
    })
  );

  app.get('*', (_req, res) => {
    res.sendFile(indexHtml);
  });
}

app.use(errorHandler);
