interface ScryfallCardPrices {
  usd: string | null;
  usd_foil: string | null;
  usd_etched: string | null;
  eur: string | null;
  eur_foil: string | null;
  tix: string | null;
}

interface ScryfallCard {
  id: string;
  name: string;
  collector_number: string;
  set_name?: string;
  set?: string;
  lang?: string;
  cardmarket_id?: number;
  rarity?: string;
  image_uris?: { small: string; normal: string; large: string };
  card_faces?: Array<{ name: string; image_uris?: { small: string; normal: string; large: string } }>;
  foil?: boolean;
  nonfoil?: boolean;
  prices?: ScryfallCardPrices;
  purchase_uris?: { cardmarket?: string };
}

interface ScryfallResponse {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
  total_cards: number;
}

export interface NormalizedMagicCard {
  externalId: string;
  name: string;
  rarity?: string;
  imageUrl?: string;
  data: {
    collectorNumber: string;
    setName?: string;
    set?: string;
    lang?: string;
    cardmarketId?: number;
    foil: boolean;
    nonfoil: boolean;
  };
  prices: ScryfallCardPrices | null;
}

const SCRYFALL_HEADERS = {
  'User-Agent': 'CardsCollectionApp/1.0 (self-hosted, personal use)',
  Accept: 'application/json',
};

async function fetchAllPages(url: string, acc: ScryfallCard[] = []): Promise<ScryfallCard[]> {
  const response = await fetch(url, { headers: SCRYFALL_HEADERS });
  if (!response.ok) {
    throw new Error(`Error consultando Scryfall (${response.status}): ${url}`);
  }
  const body = (await response.json()) as ScryfallResponse;
  const accumulated = [...acc, ...body.data];

  if (body.has_more && body.next_page) {
    return fetchAllPages(body.next_page, accumulated);
  }
  return accumulated;
}

function extractCardmarketId(cardmarketUrl?: string): number | undefined {
  if (!cardmarketUrl) return undefined;
  const match = cardmarketUrl.match(/[\\/\-](\d+)$/);
  if (match) return parseInt(match[1], 10);
  const queryMatch = cardmarketUrl.match(/[?&]idProduct=(\d+)/);
  if (queryMatch) return parseInt(queryMatch[1], 10);
  return undefined;
}

/**
 * Descarga todas las cartas de un set de Magic desde Scryfall.
 * setCode: código Scryfall del set (para 'finx' se usa 'fin' y se filtra por número de colección).
 */
export async function fetchMagicSetCards(setCode: string): Promise<NormalizedMagicCard[]> {
  const scryfallSetCode = setCode === 'finx' ? 'fin' : setCode;
  const url = `https://api.scryfall.com/cards/search?q=set:${scryfallSetCode}&unique=prints`;
  const allCards = await fetchAllPages(url);

  let filtered = allCards;
  if (setCode === 'fin') {
    filtered = allCards.filter((card) => {
      const n = parseInt(card.collector_number, 10);
      return !isNaN(n) && n >= 1 && n <= 309;
    });
  } else if (setCode === 'finx') {
    filtered = allCards.filter((card) => {
      const n = parseInt(card.collector_number, 10);
      return !isNaN(n) && n >= 310;
    });
  }

  return filtered
    .map((card): NormalizedMagicCard => {
      const imageUrl = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
      return {
        externalId: card.id,
        name: card.name,
        rarity: card.rarity,
        imageUrl,
        data: {
          collectorNumber: card.collector_number,
          setName: card.set_name,
          set: card.set,
          lang: card.lang,
          cardmarketId: card.cardmarket_id ?? extractCardmarketId(card.purchase_uris?.cardmarket),
          foil: card.foil ?? false,
          nonfoil: card.nonfoil ?? false,
        },
        prices: card.prices ?? null,
      };
    })
    .sort((a, b) =>
      a.data.collectorNumber.localeCompare(b.data.collectorNumber, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
}

export async function fetchMagicSetTotalCards(setCode: string): Promise<number> {
  const url = `https://api.scryfall.com/cards/search?q=set:${setCode}+lang:en`;
  const response = await fetch(url, { headers: SCRYFALL_HEADERS });
  if (!response.ok) return 0;
  const body = (await response.json()) as ScryfallResponse;
  return body.total_cards;
}
