import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/http-error.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  console.error(err);

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Errores de middlewares de Express (p.ej. body-parser con PayloadTooLargeError)
  // ya traen su propio status HTTP; respétalo en vez de devolver siempre 500.
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
      ? err.status
      : 500;
  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  res.status(status).json({ error: message });
}
