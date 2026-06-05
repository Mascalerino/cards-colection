import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OnePieceCard, OnePieceSet, OnePieceDeck, OnePieceCardEntry } from '@models/one-piece-card.model';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class OnePieceService {
  private readonly apiBaseUrl = '/api';
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los sets de One Piece desde JSON local
   */
  getAllSets(): Observable<OnePieceSet[]> {
    return this.http.get<Array<{ set_name: string; set_id: string }>>('assets/card-collection/onepiece-sets.json').pipe(
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
   * Obtiene todos los starter decks de One Piece desde JSON local
   */
  getAllDecks(): Observable<OnePieceDeck[]> {
    return this.http.get<Array<{ structure_deck_name: string; structure_deck_id: string }>>('assets/card-collection/onepiece-decks.json').pipe(
      map((decks) =>
        decks.map((deck) => ({
          deck_id: deck.structure_deck_id,
          deck_name: deck.structure_deck_name,
          ownedCards: 0,
          totalCards: 0,
        }))
      )
    );
  }

  /**
   * Obtiene todas las cartas de un set específico (con caché)
   */
  getSetCards(setId: string): Observable<OnePieceCard[]> {
    // Intentar obtener del caché primero
    const cached = this.getCachedData<OnePieceCard[]>(`onepiece_cards_${setId}`);
    if (cached) {
      console.log(`Cartas del set ${setId} obtenidas del caché`);
      return of(cached);
    }

    // Si no hay caché válido, obtener de la API
    console.log(`Obteniendo cartas del set ${setId} desde la API`);
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
        ),
        tap((cards) => this.setCachedData(`onepiece_cards_${setId}`, cards))
      );
  }

  /**
   * Obtiene todas las cartas de un deck específico (con caché)
   */
  getDeckCards(deckId: string): Observable<OnePieceCard[]> {
    // Intentar obtener del caché primero
    const cached = this.getCachedData<OnePieceCard[]>(`onepiece_deck_cards_${deckId}`);
    if (cached) {
      console.log(`Cartas del deck ${deckId} obtenidas del caché`);
      return of(cached);
    }

    // Si no hay caché válido, obtener de la API
    console.log(`Obteniendo cartas del deck ${deckId} desde la API`);
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
        ),
        tap((cards) => this.setCachedData(`onepiece_deck_cards_${deckId}`, cards))
      );
  }

  /**
   * Obtiene datos del caché si son válidos (no han expirado)
   */
  private getCachedData<T>(key: string): T | null {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    try {
      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Verificar si el caché ha expirado
      if (now - entry.timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Error al leer el caché:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Guarda datos en el caché con timestamp
   */
  private setCachedData<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Error al guardar en caché:', error);
    }
  }

  /**
   * Limpia todo el caché de cartas (útil para forzar actualización)
   */
  clearCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith('onepiece_cards_') || key.startsWith('onepiece_deck_cards_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Caché de cartas de One Piece limpiado');
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
