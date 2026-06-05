import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CardSet } from '@models/card-set.model';
import { Card, ScryfallResponse } from '@models/card.model';

@Injectable({
  providedIn: 'root',
})
export class CardCollectionService {
  private readonly basePath = 'assets/card-collection';

  constructor(private http: HttpClient) {}

  getMagicSets(): Observable<CardSet[]> {
    return this.http.get<any[]>(`${this.basePath}/magic-sets.json`).pipe(
      map((sets) =>
        sets.map((set) => ({
          id: set.id,
          name: set.name,
          setCode: set.setCode,
          cardmarketUrl: set.cardmarketUrl,
          ownedCards: set.ownedCards,
          cardMarketExpansionId: set.cardMarketExpansionId,
          totalCards: 0,
        }))
      )
    );
  }

  getMagicSetById(setId: string): Observable<CardSet | undefined> {
    return this.getMagicSets().pipe(map((sets) => sets.find((set) => set.id === setId)));
  }

  getSetTotalCards(setCode: string): Observable<number> {
    const url = `https://api.scryfall.com/cards/search?q=set:${setCode}+lang:en`;
    return this.http.get<ScryfallResponse>(url).pipe(map((response) => response.total_cards));
  }

  getPokemonSets(): Observable<CardSet[]> {
    return this.http.get<CardSet[]>(`${this.basePath}/pokemon-sets.json`);
  }

  getMagicSetCards(setCode: string): Observable<{ cards: Card[]; totalCards: number }> {
    // Para finx (Final Fantasy Extras), usar el código 'fin' de Scryfall
    const scryfallSetCode = setCode === 'finx' ? 'fin' : setCode;
    const url = `https://api.scryfall.com/cards/search?q=set:${scryfallSetCode}&unique=prints`;
    return this.fetchAllPages(url, []).pipe(
      map((allCards) => {
        // Filtrar cartas según el set
        let filteredCards = allCards;

        if (setCode === 'fin') {
          // Final Fantasy: cartas del 1 al 309
          filteredCards = allCards.filter((card) => {
            const collectorNum = parseInt(card.collector_number, 10);
            return !isNaN(collectorNum) && collectorNum >= 1 && collectorNum <= 309;
          });
        } else if (setCode === 'finx') {
          // Final Fantasy Extras: cartas del 310 en adelante
          filteredCards = allCards.filter((card) => {
            const collectorNum = parseInt(card.collector_number, 10);
            return !isNaN(collectorNum) && collectorNum >= 310;
          });
        }

        const cards = filteredCards.map((card) => {
          // Obtener URL de imagen (puede estar en image_uris o en la primera cara para cartas de doble cara)
          const imageUrl =
            card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? '';

          return {
            id: card.id,
            name: card.name,
            collector_number: card.collector_number,
            set_name: card.set_name,
            set: card.set,
            lang: card.lang,
            cardmarket_id:
              card.cardmarket_id ||
              (card.purchase_uris?.cardmarket
                ? this.extractCardmarketId(card.purchase_uris.cardmarket)
                : undefined),
            rarity: card.rarity,
            image_uris: imageUrl
              ? { small: imageUrl, normal: imageUrl, large: imageUrl }
              : undefined,
            foil: card.foil || false,
            nonfoil: card.nonfoil || false,
            inCollection: false,
            prices: card.prices || undefined,
          };
        });

        // Ordenar por número de colección (maneja números, letras y símbolos)
        cards.sort((a, b) => {
          return a.collector_number.localeCompare(b.collector_number, undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        });

        return {
          cards,
          totalCards: cards.length,
        };
      })
    );
  }

  private fetchAllPages(url: string, acc: any[]): Observable<any[]> {
    return this.http.get<ScryfallResponse>(url).pipe(
      switchMap((response) => {
        const accumulated = [...acc, ...response.data];
        if (response.has_more && response.next_page) {
          return this.fetchAllPages(response.next_page, accumulated);
        }
        return of(accumulated);
      })
    );
  }

  private extractCardmarketId(cardmarketUrl: string): number | undefined {
    // Extraer el ID del producto desde la URL de Cardmarket
    // Ejemplos de URLs de Cardmarket:
    // https://www.cardmarket.com/en/Magic/Products/Singles/Set-Name/Card-Name-12345
    // https://cardmarket.com/en/Magic/Products/Singles/Set-Name/Card-Name-12345
    // El ID está al final de la URL
    const match = cardmarketUrl.match(/[\\/\-](\d+)$/);
    if (match) {
      return parseInt(match[1], 10);
    }

    // Intentar extraer de URLs con query params
    // Ejemplo: https://www.cardmarket.com/en/Magic/Products/Search?idProduct=12345
    const queryMatch = cardmarketUrl.match(/[?&]idProduct=(\d+)/);
    if (queryMatch) {
      return parseInt(queryMatch[1], 10);
    }

    return undefined;
  }
}
