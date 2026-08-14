import { and, eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cardSets, cards, type Game } from '../../db/schema.js';
import { HttpError } from '../../utils/http-error.js';
import {
  generateNarutoCards,
  loadMagicSets,
  loadNarutoSeries,
  loadPokemonSets,
} from './providers/local-json.provider.js';
import { fetchMagicSetCards } from './providers/scryfall.provider.js';
import {
  fetchOnePieceDeckCards,
  fetchOnePieceDecks,
  fetchOnePieceSetCards,
  fetchOnePieceSets,
} from './providers/optcgapi.provider.js';

function isOnePieceDeck(set: typeof cardSets.$inferSelect): boolean {
  return (set.extra as { kind?: string } | null)?.kind === 'deck';
}

const PRICE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días, igual que la caché actual del frontend

const GAMES: Game[] = ['magic', 'pokemon', 'naruto', 'onepiece'];

function assertGame(game: string): asserts game is Game {
  if (!GAMES.includes(game as Game)) {
    throw new HttpError(400, `Juego no soportado: ${game}`);
  }
}

/** Devuelve los sets de un juego, sembrando la BD desde la fuente local/externa si está vacía. */
export async function getSets(gameParam: string) {
  assertGame(gameParam);
  const game = gameParam;

  const existing = await db.select().from(cardSets).where(eq(cardSets.game, game));
  if (existing.length > 0) return existing;

  const seeded = await seedSets(game);
  return seeded;
}

async function seedSets(game: Game) {
  let rows: (typeof cardSets.$inferInsert)[] = [];

  if (game === 'magic') {
    rows = loadMagicSets().map((set) => ({
      game,
      externalId: set.id,
      name: set.name,
      totalCards: null,
      extra: { setCode: set.setCode, cardmarketUrl: set.cardmarketUrl, cardMarketExpansionId: set.cardMarketExpansionId },
    }));
  } else if (game === 'pokemon') {
    rows = loadPokemonSets().map((set) => ({
      game,
      externalId: set.id,
      name: set.name,
      totalCards: set.totalCards ?? null,
      extra: { cardmarketUrl: set.cardmarketUrl },
    }));
  } else if (game === 'naruto') {
    rows = loadNarutoSeries().map((series) => ({
      game,
      externalId: series.id,
      name: series.name,
      totalCards: null,
      extra: { box: series.box, rarities: series.rarities },
    }));
  } else if (game === 'onepiece') {
    const [apiSets, apiDecks] = await Promise.all([fetchOnePieceSets(), fetchOnePieceDecks()]);
    rows = [
      ...apiSets.map((set) => ({
        game,
        externalId: set.set_id,
        name: set.set_name,
        totalCards: null,
        extra: { kind: 'set' },
      })),
      ...apiDecks.map((deck) => ({
        game,
        externalId: deck.deck_id,
        name: deck.deck_name,
        totalCards: null,
        extra: { kind: 'deck' },
      })),
    ];
  }

  if (rows.length === 0) return [];
  return db.insert(cardSets).values(rows).returning();
}

/** Devuelve las cartas de un set, sembrando el catálogo si está vacío y refrescando precios caducados. */
export async function getSetCards(gameParam: string, setExternalId: string) {
  assertGame(gameParam);
  const game = gameParam;

  const [set] = await db
    .select()
    .from(cardSets)
    .where(and(eq(cardSets.game, game), eq(cardSets.externalId, setExternalId)));

  if (!set) {
    throw new HttpError(404, `Set no encontrado: ${game}/${setExternalId}`);
  }

  const existingCards = await db.select().from(cards).where(eq(cards.setId, set.id));

  if (existingCards.length === 0) {
    return seedCards(game, set);
  }

  if (game === 'magic' || game === 'onepiece') {
    const stale = existingCards.some(
      (card) => !card.pricesFetchedAt || Date.now() - card.pricesFetchedAt.getTime() > PRICE_TTL_MS,
    );
    if (stale) {
      return refreshPrices(game, set);
    }
  }

  return existingCards;
}

async function seedCards(game: Game, set: typeof cardSets.$inferSelect) {
  let rows: (typeof cards.$inferInsert)[] = [];
  const now = new Date();

  if (game === 'magic') {
    const setCode = (set.extra as { setCode?: string } | null)?.setCode ?? set.externalId;
    const magicCards = await fetchMagicSetCards(setCode);
    rows = magicCards.map((card) => ({
      game,
      setId: set.id,
      externalId: card.externalId,
      name: card.name,
      rarity: card.rarity,
      imageUrl: card.imageUrl,
      data: card.data,
      prices: card.prices,
      pricesFetchedAt: now,
    }));
  } else if (game === 'onepiece') {
    const opCards = isOnePieceDeck(set)
      ? await fetchOnePieceDeckCards(set.externalId)
      : await fetchOnePieceSetCards(set.externalId);
    rows = opCards.map((card) => ({
      game,
      setId: set.id,
      externalId: card.externalId,
      name: card.name,
      rarity: card.rarity,
      imageUrl: card.imageUrl,
      data: card.data,
      prices: card.prices,
      pricesFetchedAt: now,
    }));
  } else if (game === 'naruto') {
    const series = loadNarutoSeries().find((s) => s.id === set.externalId);
    if (series) {
      rows = generateNarutoCards(series).map((card) => ({
        game,
        setId: set.id,
        externalId: card.externalId,
        name: card.name,
        rarity: card.rarity,
        imageUrl: null,
        data: null,
        prices: null,
        pricesFetchedAt: null,
      }));
    }
  }
  // pokemon: sin catálogo de cartas individuales de momento (solo checklist de set)

  if (rows.length === 0) return [];
  return db.insert(cards).values(rows).returning();
}

async function refreshPrices(game: Game, set: typeof cardSets.$inferSelect) {
  const now = new Date();

  if (game === 'magic') {
    const setCode = (set.extra as { setCode?: string } | null)?.setCode ?? set.externalId;
    const magicCards = await fetchMagicSetCards(setCode);
    for (const card of magicCards) {
      await db
        .update(cards)
        .set({ prices: card.prices, pricesFetchedAt: now })
        .where(and(eq(cards.game, game), eq(cards.externalId, card.externalId)));
    }
  } else if (game === 'onepiece') {
    const opCards = isOnePieceDeck(set)
      ? await fetchOnePieceDeckCards(set.externalId)
      : await fetchOnePieceSetCards(set.externalId);
    for (const card of opCards) {
      await db
        .update(cards)
        .set({ prices: card.prices, pricesFetchedAt: now })
        .where(and(eq(cards.game, game), eq(cards.externalId, card.externalId)));
    }
  }

  return db.select().from(cards).where(eq(cards.setId, set.id));
}
