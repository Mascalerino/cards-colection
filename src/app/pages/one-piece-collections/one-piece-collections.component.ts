import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { OnePieceService } from '../../services/one-piece.service';
import { CollectionApiService } from '../../services/collection-api.service';
import { OnePieceSet, OnePieceDeck, OnePieceCard } from '@models/one-piece-card.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-one-piece-collections',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTabsModule],
  templateUrl: './one-piece-collections.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './one-piece-collections.component.scss',
})
export class OnePieceCollectionsComponent implements OnInit {
  sets: OnePieceSet[] = [];
  decks: OnePieceDeck[] = [];
  loading = true;
  totalCollectionValue: number = 0;

  constructor(
    private onePieceService: OnePieceService,
    private collectionApi: CollectionApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.onePieceService.getAllSets().subscribe({
      next: (sets) => {
        this.sets = sets;
        this.sets.forEach((set) => {
          this.onePieceService.getSetCards(set.set_id).subscribe({
            next: (cards) => {
              set.totalCards = cards.length;
              this.calculateValue(set.set_id, set, cards);
            },
            error: (error) => {
              console.error(`Error al cargar cartas para ${set.set_name}:`, error);
              set.totalCards = 0;
            },
          });
        });
      },
      error: (error) => {
        console.error('Error al cargar sets de One Piece:', error);
      },
    });

    this.onePieceService.getAllDecks().subscribe({
      next: (decks) => {
        this.decks = decks;
        this.decks.forEach((deck) => {
          this.onePieceService.getDeckCards(deck.deck_id).subscribe({
            next: (cards) => {
              deck.totalCards = cards.length;
              this.calculateValue(deck.deck_id, deck, cards);
            },
            error: (error) => {
              console.error(`Error al cargar cartas para ${deck.deck_name}:`, error);
              deck.totalCards = 0;
            },
          });
        });
      },
      error: (error) => {
        console.error('Error al cargar decks de One Piece:', error);
      },
    });

    this.loading = false;
  }

  onSetClick(set: OnePieceSet): void {
    this.router.navigate(['/onepiece', set.set_id]);
  }

  onDeckClick(deck: OnePieceDeck): void {
    this.router.navigate(['/onepiece', deck.deck_id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getProgress(item: OnePieceSet | OnePieceDeck): number {
    if (!item.totalCards || item.totalCards === 0) return 0;
    return (item.ownedCards / item.totalCards) * 100;
  }

  private calculateValue(id: string, item: OnePieceSet | OnePieceDeck, cards: OnePieceCard[]): void {
    this.collectionApi.getCollection('onepiece', id).subscribe({
      next: (entries) => {
        item.ownedCards = entries.filter((e) => e.quantity > 0).length;

        let total = 0;
        entries.forEach((entry) => {
          const card = cards.find((c) => c.card_set_id === entry.cardId);
          if (card && card.market_price) {
            total += card.market_price * entry.quantity;
          }
        });
        this.totalCollectionValue += total;
      },
      error: (error) => console.error(`Error al cargar la colección de ${id}:`, error),
    });
  }
}
