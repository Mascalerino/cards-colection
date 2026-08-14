import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
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

app.use(notFoundHandler);
app.use(errorHandler);
