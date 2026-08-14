const API_BASE_URL = 'https://optcgapi.com/api';

interface OptcgapiSet {
  set_name: string;
  set_id: string;
}

interface OptcgapiCard {
  card_set_id: string;
  card_name: string;
  set_name: string;
  set_id: string;
  card_text: string;
  rarity: string;
  card_color: string;
  card_type: string;
  card_cost: string;
  card_power: string;
  sub_types: string;
  counter_amount: number;
  attribute: string;
  life: string | null;
  card_image_id: string;
  card_image: string;
  inventory_price: number;
  market_price: number;
  date_scraped: string;
}

export interface NormalizedOnePieceCard {
  externalId: string; // card_set_id
  name: string;
  rarity?: string;
  imageUrl?: string;
  data: Omit<OptcgapiCard, 'inventory_price' | 'market_price'>;
  prices: { inventory_price: number; market_price: number };
}

interface OptcgapiDeck {
  structure_deck_name: string;
  structure_deck_id: string;
}

export async function fetchOnePieceSets(): Promise<OptcgapiSet[]> {
  const response = await fetch(`${API_BASE_URL}/allSets/`);
  if (!response.ok) {
    throw new Error(`Error consultando optcgapi (${response.status}): allSets`);
  }
  return (await response.json()) as OptcgapiSet[];
}

/** deck_name/deck_id normalizados: la API real usa structure_deck_name/structure_deck_id. */
export async function fetchOnePieceDecks(): Promise<{ deck_name: string; deck_id: string }[]> {
  const response = await fetch(`${API_BASE_URL}/allDecks/`);
  if (!response.ok) {
    throw new Error(`Error consultando optcgapi (${response.status}): allDecks`);
  }
  const decks = (await response.json()) as OptcgapiDeck[];
  return decks
    .filter((d) => d.structure_deck_id)
    .map((d) => ({ deck_id: d.structure_deck_id, deck_name: d.structure_deck_name }));
}

export async function fetchOnePieceDeckCards(deckId: string): Promise<NormalizedOnePieceCard[]> {
  // La API exige pasar deck_id Y set_id (con el mismo valor) o responde 400.
  const response = await fetch(
    `${API_BASE_URL}/decks/filtered/?deck_id=${deckId}&set_id=${deckId}`,
  );
  if (!response.ok) {
    throw new Error(`Error consultando optcgapi (${response.status}): decks/filtered`);
  }
  const cards = (await response.json()) as OptcgapiCard[];

  return cards
    .map((card): NormalizedOnePieceCard => {
      const { inventory_price, market_price, ...rest } = card;
      return {
        externalId: card.card_set_id,
        name: card.card_name,
        rarity: card.rarity,
        imageUrl: card.card_image,
        data: rest,
        prices: { inventory_price, market_price },
      };
    })
    .sort((a, b) =>
      a.externalId.localeCompare(b.externalId, undefined, { numeric: true, sensitivity: 'base' }),
    );
}

export async function fetchOnePieceSetCards(setId: string): Promise<NormalizedOnePieceCard[]> {
  const response = await fetch(`${API_BASE_URL}/sets/filtered/?set_id=${setId}`);
  if (!response.ok) {
    throw new Error(`Error consultando optcgapi (${response.status}): sets/filtered`);
  }
  const cards = (await response.json()) as OptcgapiCard[];

  return cards
    .map((card): NormalizedOnePieceCard => {
      const { inventory_price, market_price, ...rest } = card;
      return {
        externalId: card.card_set_id,
        name: card.card_name,
        rarity: card.rarity,
        imageUrl: card.card_image,
        data: rest,
        prices: { inventory_price, market_price },
      };
    })
    .sort((a, b) =>
      a.externalId.localeCompare(b.externalId, undefined, { numeric: true, sensitivity: 'base' }),
    );
}
