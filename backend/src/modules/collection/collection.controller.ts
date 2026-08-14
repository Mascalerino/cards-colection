import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  deleteCollectionEntry,
  getCollectionForSet,
  upsertCollectionEntry,
} from './collection.service.js';

const upsertSchema = z.object({
  variant: z.string().nullish(),
  language: z.string().nullish(),
  condition: z.string().nullish(),
  quantity: z.number().int(),
  note: z.string().nullish(),
});

const entryKeySchema = z.object({
  variant: z.string().nullish(),
  language: z.string().nullish(),
  condition: z.string().nullish(),
});

export async function listCollection(req: Request, res: Response) {
  const entries = await getCollectionForSet(req.userId!, req.params.game, req.params.setId);
  res.json(entries);
}

export async function upsertEntry(req: Request, res: Response) {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos de colección inválidos' });
    return;
  }

  const entry = await upsertCollectionEntry(
    req.userId!,
    req.params.game,
    req.params.setId,
    req.params.cardId,
    parsed.data,
  );

  if (!entry) {
    res.status(204).send();
    return;
  }
  res.json(entry);
}

export async function deleteEntry(req: Request, res: Response) {
  const parsed = entryKeySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Parámetros inválidos' });
    return;
  }

  await deleteCollectionEntry(
    req.userId!,
    req.params.game,
    req.params.setId,
    req.params.cardId,
    parsed.data,
  );
  res.status(204).send();
}
