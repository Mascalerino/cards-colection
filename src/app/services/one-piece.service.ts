import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OnePieceCard, OnePieceSet, OnePieceDeck } from '@models/one-piece-card.model';
import { BackendCard, CollectionApiService } from './collection-api.service';

interface OnePieceCardData {
  set_name?: string;
  set_id?: string;
  card_text?: string;
  card_color?: string;
  card_type?: string;
  card_cost?: string;
  card_power?: string;
  sub_types?: string;
  counter_amount?: number;
  attribute?: string;
  life?: string | null;
  card_image_id?: string;
  date_scraped?: string;
}

interface OnePiecePrices {
  inventory_price?: number;
  market_price?: number;
}

function toOnePieceCard(backendCard: BackendCard): OnePieceCard {
  const data = (backendCard.data ?? {}) as OnePieceCardData;
  const prices = (backendCard.prices ?? {}) as OnePiecePrices;

  return {
    card_set_id: backendCard.externalId,
    card_name: backendCard.name,
    set_name: data.set_name ?? '',
    set_id: data.set_id ?? '',
    card_text: data.card_text ?? '',
    rarity: backendCard.rarity ?? '',
    card_color: data.card_color ?? '',
    card_type: data.card_type ?? '',
    card_cost: data.card_cost ?? '',
    card_power: data.card_power ?? '',
    sub_types: data.sub_types ?? '',
    counter_amount: data.counter_amount ?? 0,
    attribute: data.attribute ?? '',
    life: data.life ?? null,
    card_image_id: data.card_image_id ?? '',
    card_image: backendCard.imageUrl ?? '',
    inventory_price: prices.inventory_price ?? 0,
    market_price: prices.market_price ?? 0,
    date_scraped: data.date_scraped ?? '',
  };
}

/** Catálogo de sets/decks/cartas de One Piece, servido por el backend (con su propia caché de 7 días). */
@Injectable({
  providedIn: 'root',
})
export class OnePieceService {
  constructor(private collectionApi: CollectionApiService) {}

  getAllSets(): Observable<OnePieceSet[]> {
    return this.collectionApi.getSets('onepiece').pipe(
      map((sets) =>
        sets
          .filter((set) => (set.extra as { kind?: string } | null)?.kind !== 'deck')
          .map((set) => ({ set_id: set.externalId, set_name: set.name, ownedCards: 0, totalCards: 0 })),
      ),
    );
  }

  getAllDecks(): Observable<OnePieceDeck[]> {
    return this.collectionApi.getSets('onepiece').pipe(
      map((sets) =>
        sets
          .filter((set) => (set.extra as { kind?: string } | null)?.kind === 'deck')
          .map((set) => ({ deck_id: set.externalId, deck_name: set.name, ownedCards: 0, totalCards: 0 })),
      ),
    );
  }

  getSetCards(setId: string): Observable<OnePieceCard[]> {
    return this.collectionApi
      .getSetCards('onepiece', setId)
      .pipe(map((cards) => cards.map(toOnePieceCard)));
  }

  getDeckCards(deckId: string): Observable<OnePieceCard[]> {
    return this.getSetCards(deckId);
  }
}
