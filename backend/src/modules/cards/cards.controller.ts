import type { Request, Response } from 'express';
import { getSetCards, getSets } from './cards.service.js';

export async function listSets(req: Request, res: Response) {
  const sets = await getSets(req.params.game);
  res.json(sets);
}

export async function listSetCards(req: Request, res: Response) {
  const setCards = await getSetCards(req.params.game, req.params.setId);
  res.json(setCards);
}
