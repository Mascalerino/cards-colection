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

@Component({
  selector: 'app-one-piece-set-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatChipsModule, ProgressStatsComponent],
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
  selectedRarity: string | null = null;
  selectedColor: string | null = null;
  selectedType: string | null = null;
  searchText: string = '';

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
      },
      error: (error) => {
        console.error('Error al cargar las cartas:', error);
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.filteredCards = this.cards.filter((card) => {
      const matchesRarity = !this.selectedRarity || card.rarity === this.selectedRarity;
      const matchesColor = !this.selectedColor || card.card_color === this.selectedColor;
      const matchesType = !this.selectedType || card.card_type === this.selectedType;
      const matchesSearch = !this.searchText || 
        card.card_name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        card.card_set_id.toLowerCase().includes(this.searchText.toLowerCase());

      return matchesRarity && matchesColor && matchesType && matchesSearch;
    });
  }

  clearFilters(): void {
    this.selectedRarity = null;
    this.selectedColor = null;
    this.selectedType = null;
    this.searchText = '';
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
