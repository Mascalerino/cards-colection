export interface CardPrices {
  usd: string | null;
  usd_foil: string | null;
  usd_etched: string | null;
  eur: string | null;
  eur_foil: string | null;
  tix: string | null;
}

export interface Card {
  id: string;
  name: string;
  collector_number: string;
  set_name?: string;
  set?: string;
  lang?: string;
  cardmarket_id?: number;
  rarity?: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
  };
  card_faces?: Array<{
    name: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
    };
  }>;
  foil: boolean;
  nonfoil: boolean;
  inCollection: boolean;
  prices?: CardPrices;
}

export interface ScryfallResponse {
  data: Card[];
  has_more: boolean;
  next_page?: string;
  total_cards: number;
}
