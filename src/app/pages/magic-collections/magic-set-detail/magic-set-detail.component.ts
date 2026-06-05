import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatDialog } from '@angular/material/dialog';
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

type FilterType = 'all' | 'inCollection' | 'notInCollection';

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
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.setId = this.route.snapshot.paramMap.get('setId') || '';
    this.loadCollection();
    this.loadSetData();
    this.loadCards();

    // Listener para mostrar/ocultar botón de scroll
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
    if (confirm('¿Estás seguro de que quieres eliminar toda la colección de este set?')) {
      this.collection.clear();
      this.saveCollection();
    }
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

  loadCards(): void {
    this.cardCollectionService.getMagicSetById(this.setId).subscribe({
      next: (set) => {
        if (set) {
          this.cardCollectionService.getMagicSetCards(set.setCode).subscribe({
            next: (response) => {
              this.cards = response.cards;
              // Actualizar el total de cartas con el valor real filtrado
              if (this.set) {
                this.set.totalCards = response.totalCards;
              }
              // Actualizar el estado de las cartas después de cargarlas
              this.updateOwnedCardsCount();
              this.applyFilters();
            },
            error: (error) => {
              console.error('Error al cargar las cartas:', error);
            },
          });
        }
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

    // Filtrar por tipo
    if (this.filterType === 'inCollection') {
      filtered = filtered.filter((card) => card.inCollection);

      // Filtrar por variante (foil/nonfoil) en colección
      if (this.filterFoil || this.filterNonfoil) {
        filtered = filtered.filter((card) => {
          const collectionEntry = this.collection.get(card.id);
          const hasFoil = (collectionEntry?.foilEntries.length || 0) > 0;
          const hasNonfoil = (collectionEntry?.nonfoilEntries.length || 0) > 0;

          if (this.filterFoil && this.filterNonfoil) {
            // Ambos marcados: tiene que tener ambos tipos Y la carta debe tener ambas variantes disponibles
            return card.foil && card.nonfoil && hasFoil && hasNonfoil;
          } else if (this.filterFoil) {
            // Solo foil marcado: la carta debe tener foil disponible Y tenerlo en colección
            return card.foil && hasFoil;
          } else if (this.filterNonfoil) {
            // Solo nonfoil marcado: la carta debe tener nonfoil disponible Y tenerlo en colección
            return card.nonfoil && hasNonfoil;
          }
          return true;
        });
      }
    } else if (this.filterType === 'notInCollection') {
      // Filtrar por variante (foil/nonfoil) en NO colección
      if (this.filterFoil || this.filterNonfoil) {
        filtered = filtered.filter((card) => {
          const collectionEntry = this.collection.get(card.id);
          const hasFoil = (collectionEntry?.foilEntries.length || 0) > 0;
          const hasNonfoil = (collectionEntry?.nonfoilEntries.length || 0) > 0;

          if (this.filterFoil && this.filterNonfoil) {
            // Ambos marcados: la carta debe tener ambas variantes disponibles Y no tener ninguna
            return card.foil && card.nonfoil && !hasFoil && !hasNonfoil;
          } else if (this.filterFoil) {
            // Solo foil marcado: la carta debe tener foil disponible Y no tenerlo en colección
            return card.foil && !hasFoil;
          } else if (this.filterNonfoil) {
            // Solo nonfoil marcado: la carta debe tener nonfoil disponible Y no tenerlo en colección
            return card.nonfoil && !hasNonfoil;
          }
          return true;
        });
      } else {
        // Sin checkboxes marcados: no tiene ninguna carta
        filtered = filtered.filter((card) => !card.inCollection);
      }
    }

    // Filtrar por búsqueda
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
    this.router.navigate(['/cartas/magic']);
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
          // Volver a abrir el diálogo
          setTimeout(() => this.onAddCard(card, variant), 100);
        }
      }
    });
  }

  onRemoveCard(card: Card, variant: CardVariant): void {
    const entry = this.collection.get(card.id);
    if (!entry) return;

    const entries = variant === 'foil' ? entry.foilEntries : entry.nonfoilEntries;
    if (entries.length > 0) {
      // Eliminar una carta de la última entrada
      const lastEntry = entries[entries.length - 1];
      if (lastEntry.quantity > 1) {
        lastEntry.quantity--;
      } else {
        entries.pop();
      }

      // Si no quedan entradas, eliminar de la colección
      if (entry.foilEntries.length === 0 && entry.nonfoilEntries.length === 0) {
        this.collection.delete(card.id);
      }

      this.saveCollection();
    }
  }

  onOpenCardDetail(card: Card): void {
    const collectionEntry = this.collection.get(card.id) || null;

    const dialogRef = this.dialog.open(CardDetailPanelComponent, {
      width: '600px',
      data: { card, collectionEntry, setId: this.setId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Actualizar la colección con los cambios
        if (result.foilEntries.length === 0 && result.nonfoilEntries.length === 0) {
          this.collection.delete(card.id);
        } else {
          this.collection.set(card.id, result);
        }
        this.saveCollection();
      }
    });
  }

  openCardMarket(card: Card, event: Event): void {
    event.stopPropagation();

    if (!this.set) {
      return;
    }

    // Crear URL de CardMarket usando el nombre de la carta y el ID de expansión
    const cardName = encodeURIComponent(card.name);
    const expansionId = this.set.cardMarketExpansionId;
    const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${cardName}${expansionId ? '&idExpansion=' + expansionId : ''}`;
    window.open(url, '_blank');
  }

  private addCardEntry(entry: CardEntry): void {
    let collectionEntry = this.collection.get(entry.cardId);

    if (!collectionEntry) {
      collectionEntry = {
        cardId: entry.cardId,
        foilEntries: [],
        nonfoilEntries: [],
      };
      this.collection.set(entry.cardId, collectionEntry);
    }

    if (entry.variant === 'foil') {
      collectionEntry.foilEntries.push(entry);
    } else {
      collectionEntry.nonfoilEntries.push(entry);
    }

    this.saveCollection();
  }

  private saveCollection(): void {
    const data = Array.from(this.collection.values());
    localStorage.setItem(`collection_${this.setId}`, JSON.stringify(data));
    this.updateOwnedCardsCount();
  }

  private updateOwnedCardsCount(): void {
    // Contar las cartas únicas en la colección
    const uniqueCards = this.collection.size;
    if (this.set) {
      this.set.ownedCards = uniqueCards;
      // Guardar ownedCards en localStorage
      localStorage.setItem(`ownedCards_${this.setId}`, uniqueCards.toString());
    }

    // Actualizar el estado inCollection en las cartas
    this.cards.forEach((card) => {
      card.inCollection = this.collection.has(card.id);
    });

    // Re-aplicar filtros para actualizar la vista
    this.applyFilters();
  }

  private loadCollection(): void {
    const data = localStorage.getItem(`collection_${this.setId}`);
    if (data) {
      const entries: CardCollectionEntry[] = JSON.parse(data);
      this.collection.clear();
      entries.forEach((entry) => {
        this.collection.set(entry.cardId, entry);
      });
    }

    // Cargar ownedCards desde localStorage
    const ownedCards = localStorage.getItem(`ownedCards_${this.setId}`);
    if (ownedCards && this.set) {
      this.set.ownedCards = parseInt(ownedCards, 10);
    }

    this.updateOwnedCardsCount();
  }

  exportDuplicatesToCSV(): void {
    const csvRows: string[] = [];
    // Cabeceras del CSV
    csvRows.push(
      'cardmarketId,"quantity","name","set","setCode","cn","condition","language","isFoil","isSigned","price","comment","location","nameDE","nameES","nameFR","nameIT","rarity","listedAt"'
    );

    // Iterar sobre la colección
    this.collection.forEach((entry, cardId) => {
      const card = this.cards.find((c) => c.id === cardId);
      if (!card) return;

      const languageMap: { [key: string]: string } = {
        en: 'English',
        es: 'Spanish',
        ja: 'Japanese',
      };

      // Procesar entradas foil
      const totalFoilQuantity = entry.foilEntries.reduce((sum, e) => sum + e.quantity, 0);
      if (totalFoilQuantity > 0) {
        // Agrupar por idioma
        const foilByLanguage = new Map<string, { quantity: number }>();
        entry.foilEntries.forEach((e) => {
          const existing = foilByLanguage.get(e.language) || { quantity: 0 };
          existing.quantity += e.quantity;
          foilByLanguage.set(e.language, existing);
        });

        // Determinar cuántas foils guardamos (priorizar inglés)
        let keptFoilCount = 0;
        const hasEnglish = foilByLanguage.has('en');

        if (hasEnglish) {
          // Si hay foil en inglés, guardamos 1 en inglés
          keptFoilCount = 1;
        } else {
          // Si no hay inglés, guardamos 1 del primer idioma disponible
          keptFoilCount = 1;
        }

        foilByLanguage.forEach((data, lang) => {
          let duplicateQuantity = data.quantity;

          // Si es inglés y guardamos 1, restar 1
          if (lang === 'en' && hasEnglish && keptFoilCount > 0) {
            duplicateQuantity -= 1;
            keptFoilCount = 0; // Ya contabilizamos la que guardamos
          } else if (!hasEnglish && keptFoilCount > 0) {
            // Si no hay inglés, restar 1 solo al primer idioma
            const isFirstLang = Array.from(foilByLanguage.keys())[0] === lang;
            if (isFirstLang) {
              duplicateQuantity -= 1;
              keptFoilCount = 0;
            }
          }

          // Todas las foils restantes van al CSV
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

      // Procesar entradas nonfoil
      const totalNonfoilQuantity = entry.nonfoilEntries.reduce((sum, e) => sum + e.quantity, 0);
      if (totalNonfoilQuantity > 0) {
        // Si hay foil, todas las nonfoil son repetidas
        // Si no hay foil, todas menos 1 nonfoil son repetidas
        const hasFoil = totalFoilQuantity > 0;
        const duplicateQuantity = hasFoil ? totalNonfoilQuantity : totalNonfoilQuantity - 1;

        if (duplicateQuantity > 0) {
          // Agrupar por idioma
          const nonfoilByLanguage = new Map<string, { quantity: number }>();
          entry.nonfoilEntries.forEach((e) => {
            const existing = nonfoilByLanguage.get(e.language) || { quantity: 0 };
            existing.quantity += e.quantity;
            nonfoilByLanguage.set(e.language, existing);
          });

          nonfoilByLanguage.forEach((data, lang) => {
            let langDuplicates = data.quantity;
            // Si no hay foil y es el primer idioma procesado, restar 1
            if (!hasFoil && langDuplicates > 0) {
              // Solo restamos 1 a la primera entrada procesada
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

    // Crear y descargar el archivo CSV
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
        // Recargar la colección desde localStorage
        this.loadCollection();
        this.updateOwnedCardsCount();
        this.applyFilters();
      }
    });
  }
}
