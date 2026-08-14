import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cardSets, cards, userCollectionEntries } from '../../db/schema.js';
import { HttpError } from '../../utils/http-error.js';

interface EntryKey {
  variant?: string | null;
  language?: string | null;
  condition?: string | null;
}

function matchNullable(column: any, value?: string | null) {
  return value == null ? isNull(column) : eq(column, value);
}

async function findCard(game: string, setExternalId: string, cardExternalId: string) {
  const [set] = await db
    .select()
    .from(cardSets)
    .where(and(eq(cardSets.game, game as any), eq(cardSets.externalId, setExternalId)));

  if (!set) throw new HttpError(404, `Set no encontrado: ${game}/${setExternalId}`);

  const [card] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.setId, set.id), eq(cards.externalId, cardExternalId)));

  if (!card) throw new HttpError(404, `Carta no encontrada: ${cardExternalId}`);

  return card;
}

/**
 * Entradas de colección del usuario para un set concreto.
 * Se devuelve `cardId` como el externalId de la carta (Scryfall id, card_set_id, código de Naruto...),
 * nunca el uuid interno: es lo mismo que espera PUT/DELETE, así el frontend no conoce ids internos.
 */
export async function getCollectionForSet(userId: string, game: string, setExternalId: string) {
  const [set] = await db
    .select()
    .from(cardSets)
    .where(and(eq(cardSets.game, game as any), eq(cardSets.externalId, setExternalId)));

  if (!set) throw new HttpError(404, `Set no encontrado: ${game}/${setExternalId}`);

  const setCards = await db.select().from(cards).where(eq(cards.setId, set.id));
  if (setCards.length === 0) return [];

  const cardIds = setCards.map((c) => c.id);
  const externalIdByCardId = new Map(setCards.map((c) => [c.id, c.externalId]));

  const entries = await db
    .select()
    .from(userCollectionEntries)
    .where(
      and(
        eq(userCollectionEntries.userId, userId),
        or(...cardIds.map((id) => eq(userCollectionEntries.cardId, id))),
      ),
    );

  return entries.map((entry) => ({
    ...entry,
    cardId: externalIdByCardId.get(entry.cardId) ?? entry.cardId,
  }));
}

interface UpsertEntryInput extends EntryKey {
  quantity: number;
  note?: string | null;
}

/** Crea o actualiza (upsert) la cantidad de una carta en la colección del usuario. */
export async function upsertCollectionEntry(
  userId: string,
  game: string,
  setExternalId: string,
  cardExternalId: string,
  input: UpsertEntryInput,
) {
  const card = await findCard(game, setExternalId, cardExternalId);

  const [existing] = await db
    .select()
    .from(userCollectionEntries)
    .where(
      and(
        eq(userCollectionEntries.userId, userId),
        eq(userCollectionEntries.cardId, card.id),
        matchNullable(userCollectionEntries.variant, input.variant),
        matchNullable(userCollectionEntries.language, input.language),
        matchNullable(userCollectionEntries.condition, input.condition),
      ),
    );

  if (input.quantity <= 0) {
    if (existing) {
      await db.delete(userCollectionEntries).where(eq(userCollectionEntries.id, existing.id));
    }
    return null;
  }

  if (existing) {
    const [updated] = await db
      .update(userCollectionEntries)
      .set({ quantity: input.quantity, note: input.note ?? existing.note })
      .where(eq(userCollectionEntries.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(userCollectionEntries)
    .values({
      userId,
      cardId: card.id,
      variant: input.variant ?? null,
      language: input.language ?? null,
      condition: input.condition ?? null,
      quantity: input.quantity,
      note: input.note ?? null,
    })
    .returning();
  return created;
}

/** Elimina por completo una entrada de colección (independientemente de la cantidad). */
export async function deleteCollectionEntry(
  userId: string,
  game: string,
  setExternalId: string,
  cardExternalId: string,
  key: EntryKey,
) {
  const card = await findCard(game, setExternalId, cardExternalId);

  await db
    .delete(userCollectionEntries)
    .where(
      and(
        eq(userCollectionEntries.userId, userId),
        eq(userCollectionEntries.cardId, card.id),
        matchNullable(userCollectionEntries.variant, key.variant),
        matchNullable(userCollectionEntries.language, key.language),
        matchNullable(userCollectionEntries.condition, key.condition),
      ),
    );
}
