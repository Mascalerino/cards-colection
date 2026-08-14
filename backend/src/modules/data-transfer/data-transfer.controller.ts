import type { Request, Response } from 'express';
import { exportUserData, importUserData } from './data-transfer.service.js';

export async function exportData(req: Request, res: Response) {
  const data = await exportUserData(req.userId!);
  res.json(data);
}

export async function importData(req: Request, res: Response) {
  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    res.status(400).json({ error: 'El cuerpo debe ser un objeto JSON con las colecciones' });
    return;
  }

  const summary = await importUserData(req.userId!, req.body);
  res.json(summary);
}
