import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CardCheckboxItemComponent } from '@components/card-checkbox-item/card-checkbox-item.component';
import { ProgressStatsComponent } from '@components/progress-stats/progress-stats.component';

interface NarutoRarity {
  code: string;
  start: number;
  end: number;
  cards?: CardItem[];
}

interface CardItem {
  code: string;
  isOwned: boolean;
}

interface NarutoSeries {
  id: string;
  name: string;
  box?: string;
  rarities: NarutoRarity[];
}

@Component({
  selector: 'app-naruto-set-detail',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    CardCheckboxItemComponent,
    ProgressStatsComponent
],
  templateUrl: './naruto-set-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './naruto-set-detail.component.scss',
})
export class NarutoSetDetailComponent implements OnInit {
  seriesId: string = '';
  series: NarutoSeries | null = null;
  collection: Map<string, boolean> = new Map();
  searchTexts: Map<string, string> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.seriesId = this.route.snapshot.paramMap.get('seriesId') || '';
    this.loadCollection();
    this.loadSeriesData();
  }

  loadSeriesData(): void {
    fetch('/assets/card-collection/naruto-sets.json')
      .then((response) => response.json())
      .then((data) => {
        const foundSeries = data.series.find((s: NarutoSeries) => s.id === this.seriesId);
        if (foundSeries) {
          this.series = foundSeries;
          this.generateCardsForRarities();
        } else {
          console.error('Serie no encontrada:', this.seriesId);
          this.goBack();
        }
      })
      .catch((error) => {
        console.error('Error al cargar las series de Naruto:', error);
        this.goBack();
      });
  }

  generateCardsForRarities(): void {
    if (!this.series) return;

    this.series.rarities.forEach((rarity) => {
      rarity.cards = [];
      for (let i = rarity.start; i <= rarity.end; i++) {
        const cardCode = this.generateCardCode(this.series!.id, rarity.code, i);
        rarity.cards.push({
          code: cardCode,
          isOwned: this.collection.get(cardCode) || false,
        });
      }
    });
  }

  generateCardCode(seriesId: string, rarityCode: string, number: number): string {
    const paddedNumber = number.toString().padStart(3, '0');
    return `${seriesId}-${rarityCode}-${paddedNumber}`;
  }

  loadCollection(): void {
    const stored = localStorage.getItem(`naruto_collection_${this.seriesId}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.collection = new Map();
        // Solo cargar los valores que son true, limpiar los false
        Object.entries(data).forEach(([key, value]) => {
          if (value === true) {
            this.collection.set(key, true);
          }
        });
        // Guardar la colección limpia
        this.saveCollection();
      } catch (error) {
        console.error('Error al cargar la colección:', error);
        this.collection = new Map();
      }
    }
  }

  saveCollection(): void {
    const obj = Object.fromEntries(this.collection);
    localStorage.setItem(`naruto_collection_${this.seriesId}`, JSON.stringify(obj));
  }

  onCardToggle(event: { cardCode: string; isOwned: boolean }): void {
    if (event.isOwned) {
      this.collection.set(event.cardCode, true);
    } else {
      this.collection.delete(event.cardCode);
    }
    this.saveCollection();

    // Actualizar el objeto card en el array para que Angular detecte el cambio
    if (this.series) {
      for (const rarity of this.series.rarities) {
        const card = rarity.cards?.find((c) => c.code === event.cardCode);
        if (card) {
          card.isOwned = event.isOwned;
          break;
        }
      }
    }
  }

  getRarityProgress(rarity: NarutoRarity): { owned: number; total: number; percentage: number } {
    if (!rarity.cards) return { owned: 0, total: 0, percentage: 0 };

    const total = rarity.cards.length;
    const owned = rarity.cards.filter((card) => card.isOwned).length;
    const percentage = total > 0 ? (owned / total) * 100 : 0;

    return { owned, total, percentage };
  }

  isRarityComplete(rarity: NarutoRarity): boolean {
    if (!rarity.cards || rarity.cards.length === 0) return false;
    return rarity.cards.every((card) => card.isOwned);
  }

  toggleCompleteRarity(rarity: NarutoRarity): void {
    if (!rarity.cards) return;

    const isComplete = this.isRarityComplete(rarity);
    const newState = !isComplete;

    rarity.cards.forEach((card) => {
      card.isOwned = newState;
      if (newState) {
        this.collection.set(card.code, true);
      } else {
        this.collection.delete(card.code);
      }
    });

    this.saveCollection();
  }

  getTotalProgress(): { owned: number; total: number; percentage: number } {
    if (!this.series) return { owned: 0, total: 0, percentage: 0 };

    let totalOwned = 0;
    let totalCards = 0;

    this.series.rarities.forEach((rarity) => {
      const progress = this.getRarityProgress(rarity);
      totalOwned += progress.owned;
      totalCards += progress.total;
    });

    const percentage = totalCards > 0 ? (totalOwned / totalCards) * 100 : 0;

    return { owned: totalOwned, total: totalCards, percentage };
  }

  getSearchText(rarityCode: string): string {
    return this.searchTexts.get(rarityCode) || '';
  }

  setSearchText(rarityCode: string, value: string): void {
    if (value) {
      this.searchTexts.set(rarityCode, value);
    } else {
      this.searchTexts.delete(rarityCode);
    }
  }

  getFilteredCards(rarity: NarutoRarity): CardItem[] {
    if (!rarity.cards) return [];

    const searchText = this.getSearchText(rarity.code);
    if (!searchText.trim()) {
      return rarity.cards;
    }

    const search = searchText.toLowerCase().trim();
    return rarity.cards.filter((card) => {
      // Extraer el número de la carta del código (ej: "ANHQV-N-001" -> "001")
      const cardNumber = card.code.split('-').pop() || '';
      return cardNumber.toLowerCase().includes(search);
    });
  }

  deleteCollection(): void {
    if (confirm('¿Estás seguro de que quieres eliminar toda la colección de esta serie?')) {
      this.collection.clear();
      this.saveCollection();
      // Recargar los datos para actualizar las vistas
      this.generateCardsForRarities();
    }
  }

  goBack(): void {
    this.router.navigate(['/cartas/naruto']);
  }
}
