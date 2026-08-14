import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin, of, Observable } from 'rxjs';
import { CardCheckboxItemComponent } from '@components/card-checkbox-item/card-checkbox-item.component';
import { ProgressStatsComponent } from '@components/progress-stats/progress-stats.component';
import { CollectionApiService } from '@services/collection-api.service';

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
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './naruto-set-detail.component.scss',
})
export class NarutoSetDetailComponent implements OnInit {
  seriesId: string = '';
  series: NarutoSeries | null = null;
  collection: Map<string, boolean> = new Map();
  searchTexts: Map<string, string> = new Map();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private collectionApi: CollectionApiService,
  ) {}

  ngOnInit(): void {
    this.seriesId = this.route.snapshot.paramMap.get('seriesId') || '';
    this.loadCollectionThenSeries();
  }

  private loadCollectionThenSeries(): void {
    this.collectionApi.getCollection('naruto', this.seriesId).subscribe({
      next: (entries) => {
        this.collection = new Map(entries.filter((e) => e.quantity > 0).map((e) => [e.cardId, true]));
        this.loadSeriesData();
      },
      error: (error) => {
        console.error('Error al cargar la colección:', error);
        this.loadSeriesData();
      },
    });
  }

  loadSeriesData(): void {
    this.collectionApi.getSets('naruto').subscribe({
      next: (sets) => {
        const found = sets.find((s) => s.externalId === this.seriesId);
        if (found) {
          const extra = (found.extra ?? {}) as { box?: string; rarities?: NarutoRarity[] };
          this.series = { id: found.externalId, name: found.name, box: extra.box, rarities: extra.rarities ?? [] };
          this.generateCardsForRarities();
        } else {
          console.error('Serie no encontrada:', this.seriesId);
          this.goBack();
        }
      },
      error: (error) => {
        console.error('Error al cargar las series de Naruto:', error);
        this.goBack();
      },
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

  onCardToggle(event: { cardCode: string; isOwned: boolean }): void {
    const request: Observable<unknown> = event.isOwned
      ? this.collectionApi.upsertEntry('naruto', this.seriesId, event.cardCode, { quantity: 1 })
      : this.collectionApi.deleteEntry('naruto', this.seriesId, event.cardCode);

    request.subscribe({
      next: () => {
        if (event.isOwned) {
          this.collection.set(event.cardCode, true);
        } else {
          this.collection.delete(event.cardCode);
        }

        if (this.series) {
          for (const rarity of this.series.rarities) {
            const card = rarity.cards?.find((c) => c.code === event.cardCode);
            if (card) {
              card.isOwned = event.isOwned;
              break;
            }
          }
        }
      },
      error: (error) => console.error('Error al actualizar la colección:', error),
    });
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

    const requests: Observable<unknown>[] = rarity.cards.map((card) =>
      newState
        ? this.collectionApi.upsertEntry('naruto', this.seriesId, card.code, { quantity: 1 })
        : this.collectionApi.deleteEntry('naruto', this.seriesId, card.code),
    );

    (requests.length ? forkJoin(requests) : of([])).subscribe(() => {
      rarity.cards!.forEach((card) => {
        card.isOwned = newState;
        if (newState) {
          this.collection.set(card.code, true);
        } else {
          this.collection.delete(card.code);
        }
      });
    });
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
      const cardNumber = card.code.split('-').pop() || '';
      return cardNumber.toLowerCase().includes(search);
    });
  }

  deleteCollection(): void {
    if (!confirm('¿Estás seguro de que quieres eliminar toda la colección de esta serie?')) return;

    const requests = Array.from(this.collection.keys()).map((cardCode) =>
      this.collectionApi.deleteEntry('naruto', this.seriesId, cardCode),
    );

    (requests.length ? forkJoin(requests) : of([])).subscribe(() => {
      this.collection.clear();
      this.generateCardsForRarities();
    });
  }

  goBack(): void {
    this.router.navigate(['/naruto']);
  }
}
