import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { OnePieceService } from '../../../services/one-piece.service';
import { OnePieceCard, OnePieceCardEntry } from '@models/one-piece-card.model';
import { ProgressStatsComponent } from '@components/progress-stats/progress-stats.component';
import { CardSearchComponent } from '@components/card-search/card-search.component';

@Component({
  selector: 'app-one-piece-set-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatChipsModule, ProgressStatsComponent, CardSearchComponent],
  templateUrl: './one-piece-set-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './one-piece-set-detail.component.scss',
})
export class OnePieceSetDetailComponent implements OnInit {
  setId: string = '';
  setName: string = '';
  cards: OnePieceCard[] = [];
  filteredCards: OnePieceCard[] = [];
  collection: Map<string, OnePieceCardEntry> = new Map();
  loading = true;

  // Filtros
  currentFilter: string = 'all';
  searchText: string = '';
  collectionTotalValue: number = 0;

  // Arrays únicos para filtros
  rarities: string[] = [];
  colors: string[] = [];
  types: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private onePieceService: OnePieceService
  ) {}

  ngOnInit(): void {
    this.setId = this.route.snapshot.paramMap.get('setId') || '';

    if (!this.setId) {
      console.error('No se proporcionó un setId');
      this.goBack();
      return;
    }

    this.loadSetData();
  }

  loadSetData(): void {
    this.onePieceService.getSetCards(this.setId).subscribe({
      next: (cards) => {
        this.cards = cards;
        this.filteredCards = cards;
        this.setName = cards[0]?.set_name || 'One Piece';

        // Extraer valores únicos para filtros
        this.rarities = [...new Set(cards.map((c) => c.rarity))].sort();
        this.colors = [...new Set(cards.map((c) => c.card_color))].sort();
        this.types = [...new Set(cards.map((c) => c.card_type))].sort();

        // Cargar colección desde localStorage
        this.collection = this.onePieceService.loadCollection(this.setId);
        
        this.loading = false;
      },calculateCollectionValue();
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar las cartas:', error);
        this.loading = false;
      },
    });
  }

  calculateCollectionValue(): void {
    this.collectionTotalValue = 0;
    this.collection.forEach((entry) => {
      const card = this.cards.find((c) => c.card_set_id === entry.cardId);
      if (card && card.market_price) {
        this.collectionTotalValue += card.market_price * entry.quantity;
      }
    });
  }

  onSearchChange(searchText: string): void {
    this.searchText = searchText;
    this.applyFilters();
  }

  onFilterChange(filter: string): void {
    this.currentFilter = filter;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredCards = this.cards.filter((card) => {
      const quantity = this.getCardQuantity(card.card_set_id);
      const inCollection = quantity > 0;

    this.calculateCollectionValue();
    this.applyFilters();
  }

  removeCard(card: OnePieceCard): void {
    this.onePieceService.removeCard(this.setId, card.card_set_id);
    this.collection = this.onePieceService.loadCollection(this.setId);
    this.calculateCollectionValue();
    this.applyFilters(
      const matchesSearch = !this.searchText || 
        card.card_name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        card.card_set_id.toLowerCase().includes(this.searchText.toLowerCase());

      return matchesSearch;
    });
  }

  deleteCollection(): void {
    if (confirm('¿Estás seguro de que quieres eliminar toda la colección de este set?')) {
      this.onePieceService.clearCollection(this.setId);
      this.collection = new Map();
      this.calculateCollectionValue();
      this.applyFilters();
    }
  }

  clearFilters(): void {
    this.currentFilter = 'all'
    this.applyFilters();
  }

  getCardQuantity(cardId: string): number {
    return this.collection.get(cardId)?.quantity || 0;
  }

  addCard(card: OnePieceCard): void {
    this.onePieceService.addCard(this.setId, card.card_set_id);
    this.collection = this.onePieceService.loadCollection(this.setId);
  }

  removeCard(card: OnePieceCard): void {
    this.onePieceService.removeCard(this.setId, card.card_set_id);
    this.collection = this.onePieceService.loadCollection(this.setId);
  }

  getTotalOwned(): number {
    return Array.from(this.collection.values()).reduce((sum, entry) => sum + entry.quantity, 0);
  }

  getUniqueCardsOwned(): number {
    return this.collection.size;
  }

  getProgress(): number {
    if (this.cards.length === 0) return 0;
    return (this.getUniqueCardsOwned() / this.cards.length) * 100;
  }

  goBack(): void {
    this.router.navigate(['/onepiece']);
  }
}
