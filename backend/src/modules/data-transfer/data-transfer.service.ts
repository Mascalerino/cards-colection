import { and, eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cardSales, cardSets, cards, userCollectionEntries, type Game } from '../../db/schema.js';
import { getSetCards, getSets } from '../cards/cards.service.js';
import { upsertCollectionEntry } from '../collection/collection.service.js';

// Mismas claves/formatos que exportCollections()/importCollections() en el frontend
// (src/app/pages/card-collection.component.ts), para que el JSON exportado hoy
// desde el navegador se pueda importar directamente aquí.

interface CardEntryDto {
  cardId: string;
  variant: string;
  language: string;
  condition: string;
  quantity: number;
  note?: string;
}

interface CardCollectionEntryDto {
  cardId: string;
  foilEntries: CardEntryDto[];
  nonfoilEntries: CardEntryDto[];
}

interface OnePieceCardEntryDto {
  cardId: string;
  quantity: number;
}

interface CardSaleDto {
  id: string;
  cardId: string;
  cardName: string;
  collectorNumber: string;
  language: string;
  condition: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  saleDate: string;
  variant: string;
}

async function setsForGame(game: Game) {
  return db.select().from(cardSets).where(eq(cardSets.game, game));
}

async function entriesForSet(userId: string, setRowId: string) {
  const setCards = await db.select().from(cards).where(eq(cards.setId, setRowId));
  if (setCards.length === 0) return { entries: [], cardsById: new Map<string, typeof setCards[number]>() };

  const cardsById = new Map(setCards.map((c) => [c.id, c]));
  const cardIds = new Set(setCards.map((c) => c.id));

  const allEntries = await db
    .select()
    .from(userCollectionEntries)
    .where(eq(userCollectionEntries.userId, userId));

  const entries = allEntries.filter((entry) => cardIds.has(entry.cardId));
  return { entries, cardsById };
}

/** Construye el mismo objeto que hoy se descarga como card-collections-DD-MM-YYYY.json */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {};

  // Magic
  for (const set of await setsForGame('magic')) {
    const { entries, cardsById } = await entriesForSet(userId, set.id);
    if (entries.length === 0) continue;

    const byCard = new Map<string, CardCollectionEntryDto>();
    for (const entry of entries) {
      const card = cardsById.get(entry.cardId);
      if (!card) continue;
      if (!byCard.has(card.externalId)) {
        byCard.set(card.externalId, { cardId: card.externalId, foilEntries: [], nonfoilEntries: [] });
      }
      const dto = byCard.get(card.externalId)!;
      const entryDto: CardEntryDto = {
        cardId: card.externalId,
        variant: (entry.variant as string) ?? 'nonfoil',
        language: (entry.language as string) ?? 'en',
        condition: (entry.condition as string) ?? 'Unspecified',
        quantity: entry.quantity,
        note: entry.note ?? undefined,
      };
      (entry.variant === 'foil' ? dto.foilEntries : dto.nonfoilEntries).push(entryDto);
    }

    result[`collection_${set.externalId}`] = Array.from(byCard.values());
    result[`ownedCards_${set.externalId}`] = String(byCard.size);
  }

  // Naruto
  for (const set of await setsForGame('naruto')) {
    const { entries, cardsById } = await entriesForSet(userId, set.id);
    if (entries.length === 0) continue;

    const obj: Record<string, boolean> = {};
    for (const entry of entries) {
      const card = cardsById.get(entry.cardId);
      if (card && entry.quantity > 0) obj[card.externalId] = true;
    }
    result[`naruto_collection_${set.externalId}`] = obj;
  }

  // One Piece
  for (const set of await setsForGame('onepiece')) {
    const { entries, cardsById } = await entriesForSet(userId, set.id);
    if (entries.length === 0) continue;

    const list: OnePieceCardEntryDto[] = entries
      .map((entry) => {
        const card = cardsById.get(entry.cardId);
        return card ? { cardId: card.externalId, quantity: entry.quantity } : null;
      })
      .filter((e): e is OnePieceCardEntryDto => e !== null);

    result[`onepiece_collection_${set.externalId}`] = list;
    result[`ownedCards_onepiece_${set.externalId}`] = String(
      list.reduce((sum, e) => sum + e.quantity, 0),
    );
  }

  // Ventas (Magic)
  const magicSets = await setsForGame('magic');
  for (const set of magicSets) {
    const setCards = await db.select().from(cards).where(eq(cards.setId, set.id));
    const cardsById = new Map(setCards.map((c) => [c.id, c]));

    const setSales = await db
      .select()
      .from(cardSales)
      .where(and(eq(cardSales.userId, userId), eq(cardSales.setId, set.id)));
    if (setSales.length === 0) continue;

    result[`sales_${set.externalId}`] = setSales.map(
      (sale): CardSaleDto => ({
        id: sale.id,
        cardId: sale.cardId ? cardsById.get(sale.cardId)?.externalId ?? '' : '',
        cardName: sale.cardName ?? '',
        collectorNumber: sale.collectorNumber ?? '',
        language: sale.language ?? '',
        condition: sale.condition ?? '',
        quantity: sale.quantity,
        pricePerUnit: Number(sale.pricePerUnit),
        totalPrice: Number(sale.totalPrice),
        saleDate: sale.saleDate.toISOString(),
        variant: sale.variant ?? 'nonfoil',
      }),
    );
  }

  return result;
}

interface ImportSummary {
  importedKeys: number;
  skippedKeys: string[];
}

/** Vuelca el JSON exportado (mismo formato que hoy en localStorage) a la BD del usuario. */
export async function importUserData(
  userId: string,
  payload: Record<string, unknown>,
): Promise<ImportSummary> {
  let importedKeys = 0;
  const skippedKeys: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    try {
      if (key.startsWith('naruto_collection_')) {
        const setId = key.replace('naruto_collection_', '');
        await importNarutoCollection(userId, setId, value as Record<string, boolean>);
        importedKeys++;
      } else if (key.startsWith('onepiece_collection_')) {
        const setId = key.replace('onepiece_collection_', '');
        await importOnePieceCollection(userId, setId, value as OnePieceCardEntryDto[]);
        importedKeys++;
      } else if (key.startsWith('collection_')) {
        const setId = key.replace('collection_', '');
        await importMagicCollection(userId, setId, value as CardCollectionEntryDto[]);
        importedKeys++;
      } else if (key.startsWith('sales_')) {
        const setId = key.replace('sales_', '');
        await importSales(userId, setId, value as CardSaleDto[]);
        importedKeys++;
      } else {
        // ownedCards_* y pokemon_collection_* (sin catálogo de cartas propio):
        // se ignoran, son metadatos derivados o no soportados todavía.
        skippedKeys.push(key);
      }
    } catch (error) {
      console.error(`Error importando la clave "${key}":`, error);
      skippedKeys.push(key);
    }
  }

  return { importedKeys, skippedKeys };
}

async function importMagicCollection(userId: string, setId: string, data: CardCollectionEntryDto[]) {
  if (!Array.isArray(data) || data.length === 0) return;
  await getSets('magic'); // asegura que la lista de sets está sembrada (si no, el set de abajo no existe todavía)
  await getSetCards('magic', setId); // asegura que el catálogo (y precios) existe

  for (const entry of data) {
    for (const cardEntry of [...(entry.foilEntries ?? []), ...(entry.nonfoilEntries ?? [])]) {
      await upsertCollectionEntry(userId, 'magic', setId, entry.cardId, {
        variant: cardEntry.variant,
        language: cardEntry.language,
        condition: cardEntry.condition,
        quantity: cardEntry.quantity,
        note: cardEntry.note ?? null,
      });
    }
  }
}

async function importNarutoCollection(userId: string, setId: string, data: Record<string, boolean>) {
  if (!data || typeof data !== 'object') return;
  await getSets('naruto');
  await getSetCards('naruto', setId);

  for (const [cardCode, owned] of Object.entries(data)) {
    if (!owned) continue;
    await upsertCollectionEntry(userId, 'naruto', setId, cardCode, {
      variant: null,
      language: null,
      condition: null,
      quantity: 1,
    });
  }
}

async function importOnePieceCollection(userId: string, setId: string, data: OnePieceCardEntryDto[]) {
  if (!Array.isArray(data) || data.length === 0) return;
  await getSets('onepiece');
  await getSetCards('onepiece', setId);

  for (const entry of data) {
    await upsertCollectionEntry(userId, 'onepiece', setId, entry.cardId, {
      variant: null,
      language: null,
      condition: null,
      quantity: entry.quantity,
    });
  }
}

async function importSales(userId: string, setId: string, data: CardSaleDto[]) {
  if (!Array.isArray(data) || data.length === 0) return;
  await getSets('magic');

  const [set] = await db
    .select()
    .from(cardSets)
    .where(and(eq(cardSets.game, 'magic'), eq(cardSets.externalId, setId)));
  if (!set) return;

  const setCards = await db.select().from(cards).where(eq(cards.setId, set.id));
  const cardByExternalId = new Map(setCards.map((c) => [c.externalId, c.id]));

  for (const sale of data) {
    await db.insert(cardSales).values({
      userId,
      setId: set.id,
      cardId: cardByExternalId.get(sale.cardId) ?? null,
      cardName: sale.cardName,
      collectorNumber: sale.collectorNumber,
      language: sale.language,
      condition: sale.condition,
      variant: sale.variant,
      quantity: sale.quantity,
      pricePerUnit: sale.pricePerUnit.toFixed(2),
      totalPrice: sale.totalPrice.toFixed(2),
      saleDate: new Date(sale.saleDate),
    });
  }
}
