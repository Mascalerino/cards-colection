import { and, eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cardSales, cards, cardSets } from '../../db/schema.js';
import { HttpError } from '../../utils/http-error.js';

interface CreateSaleInput {
  cardExternalId?: string | null;
  cardName: string;
  collectorNumber?: string | null;
  language?: string | null;
  condition?: string | null;
  variant?: string | null;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  saleDate: string;
}

export async function listSales(userId: string, setExternalId: string) {
  const [set] = await db
    .select()
    .from(cardSets)
    .where(and(eq(cardSets.game, 'magic'), eq(cardSets.externalId, setExternalId)));

  if (!set) throw new HttpError(404, `Set no encontrado: magic/${setExternalId}`);

  return db
    .select()
    .from(cardSales)
    .where(and(eq(cardSales.userId, userId), eq(cardSales.setId, set.id)));
}

export async function createSale(userId: string, setExternalId: string, input: CreateSaleInput) {
  const [set] = await db
    .select()
    .from(cardSets)
    .where(and(eq(cardSets.game, 'magic'), eq(cardSets.externalId, setExternalId)));

  if (!set) throw new HttpError(404, `Set no encontrado: magic/${setExternalId}`);

  let cardId: string | null = null;
  if (input.cardExternalId) {
    const [card] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.setId, set.id), eq(cards.externalId, input.cardExternalId)));
    cardId = card?.id ?? null;
  }

  const [sale] = await db
    .insert(cardSales)
    .values({
      userId,
      setId: set.id,
      cardId,
      cardName: input.cardName,
      collectorNumber: input.collectorNumber ?? null,
      language: input.language ?? null,
      condition: input.condition ?? null,
      variant: input.variant ?? null,
      quantity: input.quantity,
      pricePerUnit: input.pricePerUnit.toFixed(2),
      totalPrice: input.totalPrice.toFixed(2),
      saleDate: new Date(input.saleDate),
    })
    .returning();

  return sale;
}

export async function deleteSale(userId: string, saleId: string) {
  const [sale] = await db
    .select()
    .from(cardSales)
    .where(and(eq(cardSales.id, saleId), eq(cardSales.userId, userId)));

  if (!sale) throw new HttpError(404, 'Venta no encontrada');

  await db.delete(cardSales).where(eq(cardSales.id, saleId));
}
