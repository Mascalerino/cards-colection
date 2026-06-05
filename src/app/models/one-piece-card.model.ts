export interface OnePieceCard {
  card_set_id: string; // ID único de la carta (ej: "OP01-077")
  card_name: string;
  set_name: string;
  set_id: string; // ej: "OP-01"
  card_text: string;
  rarity: string; // UC, R, SR, etc.
  card_color: string; // Blue, Red, Green, etc.
  card_type: string; // Character, Event, Stage, Leader
  card_cost: string;
  card_power: string;
  sub_types: string;
  counter_amount: number;
  attribute: string;
  life: string | null;
  card_image_id: string;
  card_image: string; // URL de la imagen
  inventory_price: number;
  market_price: number;
  date_scraped: string;
}

export interface OnePieceSet {
  set_id: string; // ej: "OP-01"
  set_name: string; // ej: "Romance Dawn"
  totalCards?: number;
  ownedCards: number;  collectionValue?: number;
}

export interface OnePieceDeck {
  deck_id: string; // ej: "ST-01"  
  deck_name: string;
  totalCards?: number;
  ownedCards: number;
  collectionValue?: number;}

export interface OnePieceDeck {
  deck_id: string;
  deck_name: string;
  totalCards?: number;
  ownedCards: number;
}

export interface OnePieceCardEntry {
  cardId: string; // card_set_id
  quantity: number;
}
