import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { OnePieceService } from '../../services/one-piece.service';
import { OnePieceSet, OnePieceDeck, OnePieceCard } from '@models/one-piece-card.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-one-piece-collections',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTabsModule],
  templateUrl: './one-piece-collections.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './one-piece-collections.component.scss',
})
export class OnePieceCollectionsComponent implements OnInit {
  sets: OnePieceSet[] = [];
  decks: OnePieceDeck[] = [];
  loading = true;
  totalCollectionValue: number = 0;

  constructor(
    private onePieceService: OnePieceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Cargar sets
    this.onePieceService.getAllSets().subscribe({
      next: (sets) => {
        this.sets = sets;
        
        // Cargar el total de cartas y las cartas en colección para cada set
        this.sets.forEach((set) => {
          // Cargar cartas para obtener el total
          this.onePieceService.getSetCards(set.set_id).subscribe({
            next: (cards) => {
              set.totalCards = cards.length;
              this.calculateSetValue(set.set_id, cards);
            },
            error: (error) => {
              console.error(`Error al cargar cartas para ${set.set_name}:`, error);
              set.totalCards = 0;
            },
          });

          // Cargar ownedCards desde localStorage
          const ownedCards = localStorage.getItem(`ownedCards_onepiece_${set.set_id}`);
          set.ownedCards = ownedCards ? parseInt(ownedCards, 10) : 0;
        });
      },
      error: (error) => {
        console.error('Error al cargar sets de One Piece:', error);
      },
    });

    // Cargar decks (independientemente de los sets)
    this.onePieceService.getAllDecks().subscribe({
      next: (decks) => {
        this.decks = decks;
        
        // Cargar el total de cartas y las cartas en colección para cada deck
        this.decks.forEach((deck) => {
          // Cargar cartas para obtener el total
          this.onePieceService.getDeckCards(deck.deck_id).subscribe({
            next: (cards) => {
              deck.totalCards = cards.length;
              this.calculateDeckValue(deck.deck_id, cards);
            },
            error: (error) => {
              console.error(`Error al cargar cartas para ${deck.deck_name}:`, error);
              deck.totalCards = 0;
            },
          });

          // Cargar ownedCards desde localStorage
          const ownedCards = localStorage.getItem(`ownedCards_onepiece_${deck.deck_id}`);
          deck.ownedCards = ownedCards ? parseInt(ownedCards, 10) : 0;
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

  calculateSetValue(setId: string, cards: any[]): void {
    const collection = this.onePieceServicOnePieceCard[]): void {
    const collection = this.onePieceService.loadCollection(setId);
    let setTotal = 0;

    collection.forEach((entry) => {
      const card = cards.find((c) => c.card_set_id === entry.cardId);
      if (card && card.market_price) {
        setTotal += card.market_price * entry.quantity;
      }
    });

    this.totalCollectionValue += setTotal;
  }

  calculateDeckValue(deckId: string, cards: OnePieceCarddCollection(deckId);
    let deckTotal = 0;

    collection.forEach((entry) => {
      const card = cards.find((c) => c.card_set_id === entry.cardId);
      if (card && card.market_price) {
        deckTotal += card.market_price * entry.quantity;
      }
    });

    this.totalCollectionValue += deckTotal;
  }
}

