import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export type Game = 'magic' | 'pokemon' | 'naruto' | 'onepiece';

export interface BackendCardSet {
  id: string;
  game: Game;
  externalId: string;
  name: string;
  totalCards: number | null;
  extra: Record<string, unknown> | null;
}

export interface BackendCard {
  id: string;
  game: Game;
  setId: string;
  externalId: string;
  name: string;
  rarity: string | null;
  imageUrl: string | null;
  data: Record<string, unknown> | null;
  prices: Record<string, unknown> | null;
  pricesFetchedAt: string | null;
}

export interface CollectionEntryDto {
  id: string;
  userId: string;
  cardId: string; // externalId de la carta (no el uuid interno)
  variant: string | null;
  language: string | null;
  condition: string | null;
  quantity: number;
  note: string | null;
}

export interface UpsertCollectionEntryInput {
  variant?: string | null;
  language?: string | null;
  condition?: string | null;
  quantity: number;
  note?: string | null;
}

export interface DeleteCollectionEntryQuery {
  variant?: string | null;
  language?: string | null;
  condition?: string | null;
}

/** Cliente genérico de la API del backend: catálogo (sets/cartas) y colección del usuario. */
@Injectable({
  providedIn: 'root',
})
export class CollectionApiService {
  constructor(private http: HttpClient) {}

  getSets(game: Game): Observable<BackendCardSet[]> {
    return this.http.get<BackendCardSet[]>(`${environment.apiUrl}/${game}/sets`);
  }

  getSetCards(game: Game, setId: string): Observable<BackendCard[]> {
    return this.http.get<BackendCard[]>(`${environment.apiUrl}/${game}/sets/${setId}/cards`);
  }

  getCollection(game: Game, setId: string): Observable<CollectionEntryDto[]> {
    return this.http.get<CollectionEntryDto[]>(`${environment.apiUrl}/${game}/collection/${setId}`);
  }

  upsertEntry(
    game: Game,
    setId: string,
    cardId: string,
    input: UpsertCollectionEntryInput,
  ): Observable<CollectionEntryDto | null> {
    return this.http.put<CollectionEntryDto | null>(
      `${environment.apiUrl}/${game}/collection/${setId}/${cardId}`,
      input,
    );
  }

  deleteEntry(
    game: Game,
    setId: string,
    cardId: string,
    query: DeleteCollectionEntryQuery = {},
  ): Observable<void> {
    const params: Record<string, string> = {};
    if (query.variant != null) params['variant'] = query.variant;
    if (query.language != null) params['language'] = query.language;
    if (query.condition != null) params['condition'] = query.condition;

    return this.http.delete<void>(`${environment.apiUrl}/${game}/collection/${setId}/${cardId}`, {
      params,
    });
  }
}
