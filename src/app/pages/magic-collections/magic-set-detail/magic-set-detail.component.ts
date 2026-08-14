import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { CardSearchComponent } from '@components/card-search/card-search.component';
import { ProgressStatsComponent } from '@components/progress-stats/progress-stats.component';
import { CardCollectionCounterComponent } from '@components/card-collection-counter/card-collection-counter.component';
import { AddCardDialogComponent } from '@components/add-card-dialog/add-card-dialog.component';
import { CardDetailPanelComponent } from '@components/card-detail-panel/card-detail-panel.component';
import { SellCardsDialogComponent } from '@components/sell-cards-dialog/sell-cards-dialog.component';
import { CardSet } from '@models/card-set.model';
import { Card } from '@models/card.model';
import {
  CardVariant,
  CardEntry,
  CardCollectionEntry,
} from '@models/card-entry.model';
import { CardCollectionService } from '../../../services/card-collection.service';
import { CollectionApiService, CollectionEntryDto } from '../../../services/collection-api.service';

type FilterType = 'all' | 'inCollection' | 'notInCollection';

function entryKey(variant: string, language: string, condition: string): string {
  return `${variant}|${language}|${condition}`;
}

@Component({
  selector: 'app-magic-set-detail',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    CardSearchComponent,
    ProgressStatsComponent,
    CardCollectionCounterComponent
],
  templateUrl: './magic-set-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './magic-set-detail.component.scss',
})
export class MagicSetDetailComponent implements OnInit, OnDestroy {
  setId: string = '';
  set: CardSet | null = null;
  cards: Card[] = [];
  filteredCards: Card[] = [];
  searchText: string = '';
  filterType: FilterType = 'all';
  filterFoil: boolean = false;
  filterNonfoil: boolean = false;
  collection: Map<string, CardCollectionEntry> = new Map();
  showScrollButton: boolean = false;

  get collectionFoilTotal(): number {
    let total = 0;
    this.collection.forEach((entry, cardId) => {
      const card = this.cards.find((c) => c.id === cardId);
      if (card?.prices?.eur_foil) {
        const price = parseFloat(card.prices.eur_foil);
        const quantity = entry.foilEntries.reduce((sum, e) => sum + e.quantity, 0);
        total += price * quantity;
      }
    });
    return total;
  }

  get collectionNonfoilTotal(): number {
    let total = 0;
    this.collection.forEach((entry, cardId) => {
      const card = this.cards.find((c) => c.id === cardId);
      if (card?.prices?.eur) {
        const price = parseFloat(card.prices.eur);
        const quantity = entry.nonfoilEntries.reduce((sum, e) => sum + e.quantity, 0);
        total += price * quantity;
      }
    });
    return total;
  }

  get collectionTotalValue(): number {
    return this.collectionFoilTotal + this.collectionNonfoilTotal;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cardCollectionService: CardCollectionService,
    private collectionApi: CollectionApiService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.setId = this.route.snapshot.paramMap.get('setId') || '';
    this.loadSetData();
    this.loadCollectionThenCards();

    window.addEventListener('scroll', this.onWindowScroll.bind(this));
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onWindowScroll.bind(this));
  }

  onWindowScroll(): void {
    this.showScrollButton = window.pageYOffset > 500;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteCollection(): void {
    if (!confirm('¿Estás seguro de que quieres eliminar toda la colección de este set?')) return;

    const deletions = Array.from(this.collection.entries()).flatMap(([cardId, entry]) =>
      [...entry.foilEntries, ...entry.nonfoilEntries].map((e) =>
        this.collectionApi.deleteEntry('magic', this.setId, cardId, {
          variant: e.variant,
          language: e.language,
          condition: e.condition,
        }),
      ),
    );

    (deletions.length ? forkJoin(deletions) : of([])).subscribe(() => {
      this.collection.clear();
      this.updateOwnedCardsCount();
    });
  }

  loadSetData(): void {
    this.cardCollectionService.getMagicSetById(this.setId).subscribe({
      next: (set) => {
        if (set) {
          this.set = set;
        } else {
          console.error('Set no encontrado:', this.setId);
          this.goBack();
        }
      },
      error: (error) => {
        console.error('Error al cargar el set:', error);
        this.goBack();
      },
    });
  }

  private loadCollectionThenCards(): void {
    this.collectionApi.getCollection('magic', this.setId).subscribe({
      next: (entries) => {
        this.setCollectionFromEntries(entries);
        this.loadCards();
      },
      error: (error) => {
        console.error('Error al cargar la colección:', error);
        this.loadCards();
      },
    });
  }

  private setCollectionFromEntries(entries: CollectionEntryDto[]): void {
    this.collection.clear();
    for (const dto of entries) {
      let collectionEntry = this.collection.get(dto.cardId);
      if (!collectionEntry) {
        collectionEntry = { cardId: dto.cardId, foilEntries: [], nonfoilEntries: [] };
        this.collection.set(dto.cardId, collectionEntry);
      }
      const cardEntry: CardEntry = {
        cardId: dto.cardId,
        variant: (dto.variant as CardVariant) ?? 'nonfoil',
        language: (dto.language as CardEntry['language']) ?? 'en',
        condition: (dto.condition as CardEntry['condition']) ?? 'Unspecified',
        quantity: dto.quantity,
        note: dto.note ?? undefined,
      };
      (cardEntry.variant === 'foil' ? collectionEntry.foilEntries : collectionEntry.nonfoilEntries).push(
        cardEntry,
      );
    }
    this.updateOwnedCardsCount();
  }

  loadCards(): void {
    this.cardCollectionService.getMagicSetCards(this.setId).subscribe({
      next: (response) => {
        this.cards = response.cards;
        if (this.set) {
          this.set.totalCards = response.totalCards;
        }
        this.updateOwnedCardsCount();
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error al cargar las cartas:', error);
      },
    });
  }

  onSearchChange(searchText: string): void {
    this.searchText = searchText;
    this.applyFilters();
  }

  onFilterChange(filterType: string): void {
    this.filterType = filterType as FilterType;
    this.applyFilters();
  }

  onVariantFilterChange(filters: { foil: boolean; nonfoil: boolean }): void {
    this.filterFoil = filters.foil;
    this.filterNonfoil = filters.nonfoil;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.cards;

    if (this.filterType === 'inCollection') {
      filtered = filtered.filter((card) => card.inCollection);

      if (this.filterFoil || this.filterNonfoil) {
        filtered = filtered.filter((card) => {
          const collectionEntry = this.collection.get(card.id);
          const hasFoil = (collectionEntry?.foilEntries.length || 0) > 0;
          const hasNonfoil = (collectionEntry?.nonfoilEntries.length || 0) > 0;

          if (this.filterFoil && this.filterNonfoil) {
            return card.foil && card.nonfoil && hasFoil && hasNonfoil;
          } else if (this.filterFoil) {
            return card.foil && hasFoil;
          } else if (this.filterNonfoil) {
            return card.nonfoil && hasNonfoil;
          }
          return true;
        });
      }
    } else if (this.filterType === 'notInCollection') {
      if (this.filterFoil || this.filterNonfoil) {
        filtered = filtered.filter((card) => {
          const collectionEntry = this.collection.get(card.id);
          const hasFoil = (collectionEntry?.foilEntries.length || 0) > 0;
          const hasNonfoil = (collectionEntry?.nonfoilEntries.length || 0) > 0;

          if (this.filterFoil && this.filterNonfoil) {
            return card.foil && card.nonfoil && !hasFoil && !hasNonfoil;
          } else if (this.filterFoil) {
            return card.foil && !hasFoil;
          } else if (this.filterNonfoil) {
            return card.nonfoil && !hasNonfoil;
          }
          return true;
        });
      } else {
        filtered = filtered.filter((card) => !card.inCollection);
      }
    }

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.name.toLowerCase().includes(search) ||
          card.collector_number.toLowerCase().includes(search)
      );
    }

    this.filteredCards = filtered;
  }

  goBack(): void {
    this.router.navigate(['/magic']);
  }

  getCardCount(cardId: string, variant: CardVariant): number {
    const entry = this.collection.get(cardId);
    if (!entry) return 0;

    const entries = variant === 'foil' ? entry.foilEntries : entry.nonfoilEntries;
    return entries.reduce((sum, e) => sum + e.quantity, 0);
  }

  onAddCard(card: Card, variant: CardVariant): void {
    const dialogRef = this.dialog.open(AddCardDialogComponent, {
      width: '600px',
      data: { card, variant },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.entry) {
        this.addCardEntry(result.entry);

        if (result.addAnother) {
          setTimeout(() => this.onAddCard(card, variant), 100);
        }
      }
    });
  }

  onRemoveCard(card: Card, variant: CardVariant): void {
    const entry = this.collection.get(card.id);
    if (!entry) return;

    const entries = variant === 'foil' ? entry.foilEntries : entry.nonfoilEntries;
    if (entries.length === 0) return;

    const lastEntry = entries[entries.length - 1];
    const newQuantity = lastEntry.quantity - 1;

    this.collectionApi
      .upsertEntry('magic', this.setId, card.id, {
        variant: lastEntry.variant,
        language: lastEntry.language,
        condition: lastEntry.condition,
        quantity: newQuantity,
      })
      .subscribe(() => {
        if (newQuantity > 0) {
          lastEntry.quantity = newQuantity;
        } else {
          entries.pop();
        }

        if (entry.foilEntries.length === 0 && entry.nonfoilEntries.length === 0) {
          this.collection.delete(card.id);
        }

        this.updateOwnedCardsCount();
      });
  }

  onOpenCardDetail(card: Card): void {
    const collectionEntry = this.collection.get(card.id) || null;

    const dialogRef = this.dialog.open(CardDetailPanelComponent, {
      width: '600px',
      data: { card, collectionEntry, setId: this.setId },
    });

    dialogRef.afterClosed().subscribe((result: CardCollectionEntry | undefined) => {
      if (!result) return;

      if (result.foilEntries.length === 0 && result.nonfoilEntries.length === 0) {
        this.collection.delete(card.id);
      } else {
        this.collection.set(card.id, result);
      }
      // El panel ya sincroniza sus cambios (incrementos/decrementos/ventas) con el backend.
      this.updateOwnedCardsCount();
    });
  }

  openCardMarket(card: Card, event: Event): void {
    event.stopPropagation();

    if (!this.set) return;

    const cardName = encodeURIComponent(card.name);
    const expansionId = this.set.cardMarketExpansionId;
    const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${cardName}${expansionId ? '&idExpansion=' + expansionId : ''}`;
    window.open(url, '_blank');
  }

  private addCardEntry(entry: CardEntry): void {
    let collectionEntry = this.collection.get(entry.cardId);
    const entries = entry.variant === 'foil' ? collectionEntry?.foilEntries : collectionEntry?.nonfoilEntries;
    const existing = entries?.find(
      (e) => e.language === entry.language && e.condition === entry.condition,
    );
    const newQuantity = (existing?.quantity ?? 0) + entry.quantity;

    this.collectionApi
      .upsertEntry('magic', this.setId, entry.cardId, {
        variant: entry.variant,
        language: entry.language,
        condition: entry.condition,
        quantity: newQuantity,
        note: entry.note ?? null,
      })
      .subscribe(() => {
        if (!collectionEntry) {
          collectionEntry = { cardId: entry.cardId, foilEntries: [], nonfoilEntries: [] };
          this.collection.set(entry.cardId, collectionEntry);
        }

        if (existing) {
          existing.quantity = newQuantity;
        } else {
          const list = entry.variant === 'foil' ? collectionEntry.foilEntries : collectionEntry.nonfoilEntries;
          list.push({ ...entry, quantity: newQuantity });
        }

        this.updateOwnedCardsCount();
      });
  }

  private updateOwnedCardsCount(): void {
    const uniqueCards = this.collection.size;
    if (this.set) {
      this.set.ownedCards = uniqueCards;
    }

    this.cards.forEach((card) => {
      card.inCollection = this.collection.has(card.id);
    });

    this.applyFilters();
  }

  exportDuplicatesToCSV(): void {
    const csvRows: string[] = [];
    csvRows.push(
      'cardmarketId,"quantity","name","set","setCode","cn","condition","language","isFoil","isSigned","price","comment","location","nameDE","nameES","nameFR","nameIT","rarity","listedAt"'
    );

    this.collection.forEach((entry, cardId) => {
      const card = this.cards.find((c) => c.id === cardId);
      if (!card) return;

      const languageMap: { [key: string]: string } = {
        en: 'English',
        es: 'Spanish',
        ja: 'Japanese',
      };

      const totalFoilQuantity = entry.foilEntries.reduce((sum, e) => sum + e.quantity, 0);
      if (totalFoilQuantity > 0) {
        const foilByLanguage = new Map<string, { quantity: number }>();
        entry.foilEntries.forEach((e) => {
          const existing = foilByLanguage.get(e.language) || { quantity: 0 };
          existing.quantity += e.quantity;
          foilByLanguage.set(e.language, existing);
        });

        let keptFoilCount = 0;
        const hasEnglish = foilByLanguage.has('en');

        if (hasEnglish) {
          keptFoilCount = 1;
        } else {
          keptFoilCount = 1;
        }

        foilByLanguage.forEach((data, lang) => {
          let duplicateQuantity = data.quantity;

          if (lang === 'en' && hasEnglish && keptFoilCount > 0) {
            duplicateQuantity -= 1;
            keptFoilCount = 0;
          } else if (!hasEnglish && keptFoilCount > 0) {
            const isFirstLang = Array.from(foilByLanguage.keys())[0] === lang;
            if (isFirstLang) {
              duplicateQuantity -= 1;
              keptFoilCount = 0;
            }
          }

          if (duplicateQuantity > 0) {
            const row = [
              card.cardmarket_id || '',
              `"${duplicateQuantity}"`,
              `"${card.name}"`,
              `"${card.set_name || ''}"`,
              `"${card.set || ''}"`,
              `"${card.collector_number || ''}"`,
              `"NM"`,
              `"${languageMap[lang] || 'English'}"`,
              `"true"`,
              `"false"`,
              `""`,
              `""`,
              `""`,
              `""`,
              `""`,
              `""`,
              `""`,
              `"${card.rarity || ''}"`,
              `""`,
            ].join(',');
            csvRows.push(row);
          }
        });
      }

      const totalNonfoilQuantity = entry.nonfoilEntries.reduce((sum, e) => sum + e.quantity, 0);
      if (totalNonfoilQuantity > 0) {
        const hasFoil = totalFoilQuantity > 0;
        const duplicateQuantity = hasFoil ? totalNonfoilQuantity : totalNonfoilQuantity - 1;

        if (duplicateQuantity > 0) {
          const nonfoilByLanguage = new Map<string, { quantity: number }>();
          entry.nonfoilEntries.forEach((e) => {
            const existing = nonfoilByLanguage.get(e.language) || { quantity: 0 };
            existing.quantity += e.quantity;
            nonfoilByLanguage.set(e.language, existing);
          });

          nonfoilByLanguage.forEach((data, lang) => {
            let langDuplicates = data.quantity;
            if (!hasFoil && langDuplicates > 0) {
              const isFirstLang = Array.from(nonfoilByLanguage.keys())[0] === lang;
              if (isFirstLang) {
                langDuplicates -= 1;
              }
            }

            if (langDuplicates > 0) {
              const row = [
                card.cardmarket_id || '',
                `"${langDuplicates}"`,
                `"${card.name}"`,
                `"${card.set_name || ''}"`,
                `"${card.set || ''}"`,
                `"${card.collector_number || ''}"`,
                `"NM"`,
                `"${languageMap[lang] || 'English'}"`,
                `"false"`,
                `"false"`,
                `""`,
                `""`,
                `""`,
                `""`,
                `""`,
                `""`,
                `""`,
                `"${card.rarity || ''}"`,
                `""`,
              ].join(',');
              csvRows.push(row);
            }
          });
        }
      }
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.set?.name || 'collection'}_duplicates.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openSellCardsDialog(): void {
    const dialogRef = this.dialog.open(SellCardsDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        setId: this.setId,
        cards: this.cards,
        collection: this.collection,
      },
    });

    dialogRef.afterClosed().subscribe((hasChanges) => {
      if (hasChanges) {
        this.loadCollectionThenCards();
      }
    });
  }
}
