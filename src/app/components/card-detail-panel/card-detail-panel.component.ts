import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Card } from '@models/card.model';
import {
  CardEntry,
  CardCollectionEntry,
} from '@models/card-entry.model';
import { CardSale } from '@models/card-sale.model';
import { CollectionApiService } from '@services/collection-api.service';
import { SalesApiService, BackendSale } from '@services/sales-api.service';

export interface CardDetailPanelData {
  card: Card;
  collectionEntry: CardCollectionEntry | null;
  setId: string;
}

interface DisplayEntry extends CardEntry {
  displayType: string;
}

function toCardSale(sale: BackendSale): CardSale {
  return {
    id: sale.id,
    cardId: sale.cardId ?? '',
    cardName: sale.cardName ?? '',
    collectorNumber: sale.collectorNumber ?? '',
    language: (sale.language as CardSale['language']) ?? 'en',
    condition: (sale.condition as CardSale['condition']) ?? 'Unspecified',
    quantity: sale.quantity,
    pricePerUnit: parseFloat(sale.pricePerUnit),
    totalPrice: parseFloat(sale.totalPrice),
    saleDate: sale.saleDate,
    variant: (sale.variant as CardSale['variant']) ?? 'nonfoil',
  };
}

@Component({
  selector: 'app-card-detail-panel',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule
],
  templateUrl: './card-detail-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './card-detail-panel.component.scss',
})
export class CardDetailPanelComponent implements OnInit {
  card: Card;
  collectionEntry: CardCollectionEntry;
  allEntries: DisplayEntry[] = [];
  setId: string;
  salesHistory: CardSale[] = [];
  displayedColumns: string[] = [
    'date',
    'variant',
    'language',
    'condition',
    'quantity',
    'price',
    'actions',
  ];

  constructor(
    private dialogRef: MatDialogRef<CardDetailPanelComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CardDetailPanelData,
    private collectionApi: CollectionApiService,
    private salesApi: SalesApiService,
  ) {
    this.card = data.card;
    this.setId = data.setId;
    this.collectionEntry = data.collectionEntry || {
      cardId: this.card.id,
      foilEntries: [],
      nonfoilEntries: [],
    };

    this.updateAllEntries();
  }

  ngOnInit(): void {
    this.loadSalesHistory();
  }

  loadSalesHistory(): void {
    this.salesApi.listSales(this.setId).subscribe({
      next: (sales) => {
        this.salesHistory = sales
          .filter((sale) => sale.cardId === this.card.id)
          .map(toCardSale)
          .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
      },
      error: (error) => console.error('Error al cargar el historial de ventas:', error),
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getTotalSalesAmount(): string {
    const total = this.salesHistory.reduce((sum, sale) => sum + sale.totalPrice, 0);
    return total.toFixed(2);
  }

  deleteSale(sale: CardSale): void {
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar esta venta? La carta se devolverá a la colección.'
      )
    ) {
      return;
    }

    this.salesApi.deleteSale(sale.id).subscribe({
      next: () => {
        this.returnCardsToCollection(sale);
        this.loadSalesHistory();
      },
      error: (error) => console.error('Error al eliminar la venta:', error),
    });
  }

  private returnCardsToCollection(sale: CardSale): void {
    const entries =
      sale.variant === 'foil'
        ? this.collectionEntry.foilEntries
        : this.collectionEntry.nonfoilEntries;

    const existingEntry = entries.find(
      (e) => e.language === sale.language && e.condition === sale.condition
    );
    const newQuantity = (existingEntry?.quantity ?? 0) + sale.quantity;

    this.collectionApi
      .upsertEntry(this.card_game(), this.setId, this.card.id, {
        variant: sale.variant,
        language: sale.language,
        condition: sale.condition,
        quantity: newQuantity,
      })
      .subscribe(() => {
        if (existingEntry) {
          existingEntry.quantity = newQuantity;
        } else {
          const newEntry: CardEntry = {
            cardId: sale.cardId,
            variant: sale.variant,
            language: sale.language,
            condition: sale.condition,
            quantity: sale.quantity,
          };
          entries.push(newEntry);
        }
        this.updateAllEntries();
      });
  }

  private card_game(): 'magic' {
    // El panel de detalle solo se usa para Magic (ventas/CardMarket).
    return 'magic';
  }

  get cardTitle(): string {
    return `${this.card.name} (#${this.card.collector_number})`;
  }

  get nonfoilTotal(): number {
    if (!this.card.prices?.eur) return 0;
    const price = parseFloat(this.card.prices.eur);
    const totalQuantity = this.collectionEntry.nonfoilEntries.reduce(
      (sum, entry) => sum + entry.quantity,
      0
    );
    return price * totalQuantity;
  }

  get foilTotal(): number {
    if (!this.card.prices?.eur_foil) return 0;
    const price = parseFloat(this.card.prices.eur_foil);
    const totalQuantity = this.collectionEntry.foilEntries.reduce(
      (sum, entry) => sum + entry.quantity,
      0
    );
    return price * totalQuantity;
  }

  get totalCards(): number {
    return this.allEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  }

  getLanguageLabel(lang: string): string {
    const labels: { [key: string]: string } = {
      en: 'EN',
      es: 'ES',
      ja: 'JA',
    };
    return labels[lang] || lang.toUpperCase();
  }

  incrementEntry(entry: DisplayEntry): void {
    const originalEntry = this.findOriginalEntry(entry);
    if (!originalEntry) return;

    const newQuantity = originalEntry.quantity + 1;
    this.collectionApi
      .upsertEntry(this.card_game(), this.setId, this.card.id, {
        variant: originalEntry.variant,
        language: originalEntry.language,
        condition: originalEntry.condition,
        quantity: newQuantity,
      })
      .subscribe(() => {
        originalEntry.quantity = newQuantity;
        entry.quantity = newQuantity;
      });
  }

  decrementEntry(entry: DisplayEntry): void {
    const originalEntry = this.findOriginalEntry(entry);
    if (!originalEntry) return;

    const newQuantity = originalEntry.quantity - 1;

    this.collectionApi
      .upsertEntry(this.card_game(), this.setId, this.card.id, {
        variant: originalEntry.variant,
        language: originalEntry.language,
        condition: originalEntry.condition,
        quantity: newQuantity,
      })
      .subscribe(() => {
        if (newQuantity > 0) {
          originalEntry.quantity = newQuantity;
          entry.quantity = newQuantity;
        } else {
          const list =
            entry.variant === 'foil' ? this.collectionEntry.foilEntries : this.collectionEntry.nonfoilEntries;
          const index = list.indexOf(originalEntry);
          if (index > -1) list.splice(index, 1);
          this.updateAllEntries();
        }
      });
  }

  private findOriginalEntry(displayEntry: DisplayEntry): CardEntry | undefined {
    const entries =
      displayEntry.variant === 'foil'
        ? this.collectionEntry.foilEntries
        : this.collectionEntry.nonfoilEntries;

    return entries.find(
      (e) =>
        e.language === displayEntry.language &&
        e.condition === displayEntry.condition &&
        e.variant === displayEntry.variant
    );
  }

  close(): void {
    this.dialogRef.close(this.collectionEntry);
  }

  private updateAllEntries(): void {
    this.allEntries = [];

    this.collectionEntry.foilEntries.forEach((entry) => {
      this.allEntries.push({
        ...entry,
        displayType: 'Foil',
      });
    });

    this.collectionEntry.nonfoilEntries.forEach((entry) => {
      this.allEntries.push({
        ...entry,
        displayType: 'Normal',
      });
    });
  }
}
