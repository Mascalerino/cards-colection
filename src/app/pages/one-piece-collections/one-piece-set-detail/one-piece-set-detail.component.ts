import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin, of } from 'rxjs';
import { OnePieceService } from '../../../services/one-piece.service';
import { CollectionApiService } from '../../../services/collection-api.service';
import { OnePieceCard, OnePieceCardEntry } from '@models/one-piece-card.model';
import { ProgressStatsComponent } from '@components/progress-stats/progress-stats.component';
import { CardSearchComponent } from '@components/card-search/card-search.component';

@Component({
  selector: 'app-one-piece-set-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, ProgressStatsComponent, CardSearchComponent],
  templateUrl: './one-piece-set-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './one-piece-set-detail.component.scss',
})
export class OnePieceSetDetailComponent implements OnInit {
  setId: string = '';
  setName: string = '';
  cards: OnePieceCard[] = [];
  filteredCards: OnePieceCard[] = [];
  collection: Map<string, OnePieceCardEntry> = new Map();
  loading = true;

  currentFilter: string = 'all';
  searchText: string = '';
  collectionTotalValue: number = 0;

  showAdvancedFilters: boolean = false;
  rarities: string[] = [];
  colors: string[] = [];
  types: string[] = [];
  selectedRarity: string | null = null;
  selectedColor: string | null = null;
  selectedType: string | null = null;

  sortOrder: string = 'none';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private onePieceService: OnePieceService,
    private collectionApi: CollectionApiService,
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

        this.rarities = [...new Set(cards.map((c) => c.rarity))].sort();
        this.colors = [...new Set(cards.map((c) => c.card_color))].sort();
        this.types = [...new Set(cards.map((c) => c.card_type))].sort();

        this.loadCollection();
      },
      error: (error) => {
        console.error('Error al cargar las cartas:', error);
        this.loading = false;
      },
    });
  }

  private loadCollection(): void {
    this.collectionApi.getCollection('onepiece', this.setId).subscribe({
      next: (entries) => {
        this.collection = new Map(
          entries.map((e) => [e.cardId, { cardId: e.cardId, quantity: e.quantity }]),
        );
        this.calculateCollectionValue();
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar la colección:', error);
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

      if (this.currentFilter === 'inCollection' && !inCollection) return false;
      if (this.currentFilter === 'notInCollection' && inCollection) return false;

      const matchesSearch = !this.searchText ||
        card.card_name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        card.card_set_id.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesRarity = !this.selectedRarity || card.rarity === this.selectedRarity;
      const matchesColor = !this.selectedColor || card.card_color === this.selectedColor;
      const matchesType = !this.selectedType || card.card_type === this.selectedType;

      return matchesSearch && matchesRarity && matchesColor && matchesType;
    });

    this.applySorting();
  }

  onSortChange(sort: string): void {
    this.sortOrder = sort;
    this.applySorting();
  }

  applySorting(): void {
    switch (this.sortOrder) {
      case 'cardNumberAsc':
        this.filteredCards.sort((a, b) => this.extractCardNumber(a.card_set_id) - this.extractCardNumber(b.card_set_id));
        break;
      case 'cardNumberDesc':
        this.filteredCards.sort((a, b) => this.extractCardNumber(b.card_set_id) - this.extractCardNumber(a.card_set_id));
        break;
      case 'priceAsc':
        this.filteredCards.sort((a, b) => (a.market_price || 0) - (b.market_price || 0));
        break;
      case 'priceDesc':
        this.filteredCards.sort((a, b) => (b.market_price || 0) - (a.market_price || 0));
        break;
      default:
        break;
    }
  }

  extractCardNumber(cardId: string): number {
    const match = cardId.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  clearAdvancedFilters(): void {
    this.selectedRarity = null;
    this.selectedColor = null;
    this.selectedType = null;
    this.applyFilters();
  }

  deleteCollection(): void {
    if (!confirm('¿Estás seguro de que quieres eliminar toda la colección de este set?')) return;

    const requests = Array.from(this.collection.keys()).map((cardId) =>
      this.collectionApi.deleteEntry('onepiece', this.setId, cardId),
    );

    (requests.length ? forkJoin(requests) : of([])).subscribe(() => {
      this.collection = new Map();
      this.calculateCollectionValue();
      this.applyFilters();
    });
  }

  openCardMarket(card: OnePieceCard, event: Event): void {
    event.stopPropagation();
    const cardId = encodeURIComponent(card.card_set_id);
    const url = `https://www.cardmarket.com/en/OnePiece/Products/Search?searchString=${cardId}`;
    window.open(url, '_blank');
  }

  getCardQuantity(cardId: string): number {
    return this.collection.get(cardId)?.quantity || 0;
  }

  addCard(card: OnePieceCard): void {
    const newQuantity = this.getCardQuantity(card.card_set_id) + 1;
    this.collectionApi
      .upsertEntry('onepiece', this.setId, card.card_set_id, { quantity: newQuantity })
      .subscribe(() => {
        this.collection.set(card.card_set_id, { cardId: card.card_set_id, quantity: newQuantity });
        this.calculateCollectionValue();
        this.applyFilters();
      });
  }

  removeCard(card: OnePieceCard): void {
    const newQuantity = this.getCardQuantity(card.card_set_id) - 1;
    this.collectionApi
      .upsertEntry('onepiece', this.setId, card.card_set_id, { quantity: newQuantity })
      .subscribe(() => {
        if (newQuantity > 0) {
          this.collection.set(card.card_set_id, { cardId: card.card_set_id, quantity: newQuantity });
        } else {
          this.collection.delete(card.card_set_id);
        }
        this.calculateCollectionValue();
        this.applyFilters();
      });
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
