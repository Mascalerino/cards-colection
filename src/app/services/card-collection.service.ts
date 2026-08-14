import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CardSet } from '@models/card-set.model';
import { Card } from '@models/card.model';
import { BackendCard, BackendCardSet, CollectionApiService } from './collection-api.service';

interface MagicSetExtra {
  setCode: string;
  cardmarketUrl: string;
  cardMarketExpansionId: number;
}

interface PokemonSetExtra {
  cardmarketUrl: string;
}

interface MagicCardData {
  collectorNumber: string;
  setName?: string;
  set?: string;
  lang?: string;
  cardmarketId?: number;
  foil: boolean;
  nonfoil: boolean;
}

function toCardSet(set: BackendCardSet): CardSet {
  const extra = (set.extra ?? {}) as Partial<MagicSetExtra & PokemonSetExtra>;
  return {
    id: set.externalId,
    name: set.name,
    setCode: extra.setCode ?? set.externalId,
    cardmarketUrl: extra.cardmarketUrl ?? '',
    cardMarketExpansionId: extra.cardMarketExpansionId ?? 0,
    totalCards: set.totalCards ?? 0,
    ownedCards: 0, // se calcula aparte a partir de la colección del usuario
  };
}

function toCard(backendCard: BackendCard): Card {
  const data = (backendCard.data ?? {}) as Partial<MagicCardData>;
  return {
    id: backendCard.externalId,
    name: backendCard.name,
    collector_number: data.collectorNumber ?? '',
    set_name: data.setName,
    set: data.set,
    lang: data.lang,
    cardmarket_id: data.cardmarketId,
    rarity: backendCard.rarity ?? undefined,
    image_uris: backendCard.imageUrl
      ? { small: backendCard.imageUrl, normal: backendCard.imageUrl, large: backendCard.imageUrl }
      : undefined,
    foil: data.foil ?? false,
    nonfoil: data.nonfoil ?? false,
    inCollection: false,
    prices: (backendCard.prices as unknown as Card['prices']) ?? undefined,
  };
}

@Injectable({
  providedIn: 'root',
})
export class CardCollectionService {
  constructor(private collectionApi: CollectionApiService) {}

  getMagicSets(): Observable<CardSet[]> {
    return this.collectionApi.getSets('magic').pipe(map((sets) => sets.map(toCardSet)));
  }

  getMagicSetById(setId: string): Observable<CardSet | undefined> {
    return this.getMagicSets().pipe(map((sets) => sets.find((set) => set.id === setId)));
  }

  getPokemonSets(): Observable<CardSet[]> {
    return this.collectionApi.getSets('pokemon').pipe(map((sets) => sets.map(toCardSet)));
  }

  /** setId: id interno del set (p.ej. "final-fantasy"), no el setCode de Scryfall. */
  getMagicSetCards(setId: string): Observable<{ cards: Card[]; totalCards: number }> {
    return this.collectionApi.getSetCards('magic', setId).pipe(
      map((backendCards) => {
        const cards = backendCards.map(toCard).sort((a, b) =>
          a.collector_number.localeCompare(b.collector_number, undefined, {
            numeric: true,
            sensitivity: 'base',
          }),
        );
        return { cards, totalCards: cards.length };
      }),
    );
  }
}
