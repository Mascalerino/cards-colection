import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OnePieceCard, OnePieceSet, OnePieceDeck, OnePieceCardEntry } from '@models/one-piece-card.model';

@Injectable({
  providedIn: 'root',
})
export class OnePieceService {
  private readonly apiBaseUrl = '/api';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los sets de One Piece desde la API
   */
  getAllSets(): Observable<OnePieceSet[]> {
    return this.http.get<Array<{ set_name: string; set_id: string }>>(`${this.apiBaseUrl}/allSets/`).pipe(
      map((sets) =>
        sets.map((set) => ({
          set_id: set.set_id,
          set_name: set.set_name,
          ownedCards: 0,
          totalCards: 0,
        }))
      )
    );
  }

  /**
   * Obtiene todos los starter decks de One Piece desde la API
   */
  getAllDecks(): Observable<OnePieceDeck[]> {
    return this.http.get<Array<{ deck_name: string; deck_id: string }>>(`${this.apiBaseUrl}/allDecks/`).pipe(
      map((decks) =>
        decks.map((deck) => ({
          deck_id: deck.deck_id,
          deck_name: deck.deck_name,
          ownedCards: 0,
          totalCards: 0,
        }))
      )
    );
  }

  /**
   * Obtiene todas las cartas de un set específico
   */
  getSetCards(setId: string): Observable<OnePieceCard[]> {
    return this.http
      .get<OnePieceCard[]>(`${this.apiBaseUrl}/sets/filtered/?set_id=${setId}`)
      .pipe(
        map((cards) =>
          cards.sort((a, b) =>
            a.card_set_id.localeCompare(b.card_set_id, undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          )
        )
      );
  }

  /**
   * Obtiene todas las cartas de un deck específico
   */
  getDeckCards(deckId: string): Observable<OnePieceCard[]> {
    return this.http
      .get<OnePieceCard[]>(`${this.apiBaseUrl}/decks/filtered/?deck_id=${deckId}`)
      .pipe(
        map((cards) =>
          cards.sort((a, b) =>
            a.card_set_id.localeCompare(b.card_set_id, undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          )
        )
      );
  }

  /**
   * Carga la colección del usuario desde localStorage para un set específico
   */
  loadCollection(setId: string): Map<string, OnePieceCardEntry> {
    const storageKey = `onepiece_collection_${setId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) {
      return new Map();
    }

    try {
      const entries: OnePieceCardEntry[] = JSON.parse(stored);
      return new Map(entries.map((entry) => [entry.cardId, entry]));
    } catch (error) {
      console.error('Error al cargar la colección de One Piece:', error);
      return new Map();
    }
  }

  /**
   * Guarda la colección del usuario en localStorage
   */
  saveCollection(setId: string, collection: Map<string, OnePieceCardEntry>): void {
    const storageKey = `onepiece_collection_${setId}`;
    const entries = Array.from(collection.values());
    localStorage.setItem(storageKey, JSON.stringify(entries));

    // Actualizar contador de cartas poseídas
    const ownedCount = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    localStorage.setItem(`ownedCards_onepiece_${setId}`, ownedCount.toString());
  }

  /**
   * Agrega una carta a la colección
   */
  addCard(setId: string, cardId: string, quantity: number = 1): void {
    const collection = this.loadCollection(setId);
    const entry = collection.get(cardId);

    if (entry) {
      entry.quantity += quantity;
    } else {
      collection.set(cardId, { cardId, quantity });
    }

    this.saveCollection(setId, collection);
  }

  /**
   * Elimina una carta de la colección
   */
  removeCard(setId: string, cardId: string, quantity: number = 1): void {
    const collection = this.loadCollection(setId);
    const entry = collection.get(cardId);

    if (entry) {
      entry.quantity -= quantity;
      if (entry.quantity <= 0) {
        collection.delete(cardId);
      }
      this.saveCollection(setId, collection);
    }
  }

  /**
   * Obtiene la cantidad de una carta en la colección
   */
  getCardQuantity(setId: string, cardId: string): number {
    const collection = this.loadCollection(setId);
    return collection.get(cardId)?.quantity || 0;
  }

  /**
   * Limpia la colección de un set
   */
  clearCollection(setId: string): void {
    const storageKey = `onepiece_collection_${setId}`;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`ownedCards_onepiece_${setId}`);
  }
}
