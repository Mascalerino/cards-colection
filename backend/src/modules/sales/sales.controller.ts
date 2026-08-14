import type { Request, Response } from 'express';
import { z } from 'zod';
import { createSale, deleteSale, listSales } from './sales.service.js';

const createSaleSchema = z.object({
  cardExternalId: z.string().nullish(),
  cardName: z.string().min(1),
  collectorNumber: z.string().nullish(),
  language: z.string().nullish(),
  condition: z.string().nullish(),
  variant: z.string().nullish(),
  quantity: z.number().int().positive(),
  pricePerUnit: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  saleDate: z.string(),
  setId: z.string().min(1),
});

export async function listSetSales(req: Request, res: Response) {
  const sales = await listSales(req.userId!, req.params.setId);
  res.json(sales);
}

export async function createSetSale(req: Request, res: Response) {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Datos de venta inválidos' });
    return;
  }

  const { setId, ...saleInput } = parsed.data;
  const sale = await createSale(req.userId!, setId, saleInput);
  res.status(201).json(sale);
}

export async function deleteSetSale(req: Request, res: Response) {
  await deleteSale(req.userId!, req.params.saleId);
  res.status(204).send();
}
