import { Component, Inject, OnInit } from '@angular/core';

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

export interface CardDetailPanelData {
  card: Card;
  collectionEntry: CardCollectionEntry | null;
  setId: string;
}

interface DisplayEntry extends CardEntry {
  displayType: string;
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
    @Inject(MAT_DIALOG_DATA) public data: CardDetailPanelData
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
    const storageKey = `sales_${this.setId}`;
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      const allSales: CardSale[] = JSON.parse(storedData);
      // Filtrar solo las ventas de esta carta
      this.salesHistory = allSales.filter((sale) => sale.cardId === this.card.id);
      // Ordenar por fecha más reciente primero
      this.salesHistory.sort(
        (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
      );
    }
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

    // 1. Eliminar la venta del localStorage
    const storageKey = `sales_${this.setId}`;
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      let allSales: CardSale[] = JSON.parse(storedData);
      // Filtrar para remover esta venta específica
      allSales = allSales.filter((s) => s.id !== sale.id);
      localStorage.setItem(storageKey, JSON.stringify(allSales));
    }

    // 2. Devolver la carta a la colección
    this.returnCardsToCollection(sale);

    // 3. Actualizar la colección en localStorage
    this.saveCollectionToStorage();

    // 4. Recargar el historial de ventas
    this.loadSalesHistory();

    // 5. Actualizar la vista de entradas
    this.updateAllEntries();
  }

  private returnCardsToCollection(sale: CardSale): void {
    // Buscar si ya existe una entrada con el mismo idioma, condición y variante
    const entries =
      sale.variant === 'foil'
        ? this.collectionEntry.foilEntries
        : this.collectionEntry.nonfoilEntries;

    const existingEntry = entries.find(
      (e) => e.language === sale.language && e.condition === sale.condition
    );

    if (existingEntry) {
      // Si existe, incrementar la cantidad
      existingEntry.quantity += sale.quantity;
    } else {
      // Si no existe, crear una nueva entrada
      const newEntry: CardEntry = {
        cardId: sale.cardId,
        variant: sale.variant,
        language: sale.language,
        condition: sale.condition,
        quantity: sale.quantity,
      };

      if (sale.variant === 'foil') {
        this.collectionEntry.foilEntries.push(newEntry);
      } else {
        this.collectionEntry.nonfoilEntries.push(newEntry);
      }
    }
  }

  private saveCollectionToStorage(): void {
    const storageKey = `collection_${this.setId}`;
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      let collection: CardCollectionEntry[] = JSON.parse(storedData);

      // Buscar la entrada de esta carta en la colección
      const cardIndex = collection.findIndex((c) => c.cardId === this.card.id);

      if (cardIndex > -1) {
        // Actualizar la entrada existente
        collection[cardIndex] = this.collectionEntry;
      } else {
        // Añadir nueva entrada si no existe
        collection.push(this.collectionEntry);
      }

      localStorage.setItem(storageKey, JSON.stringify(collection));
    }
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
    // Encontrar y actualizar la entrada original
    const originalEntry = this.findOriginalEntry(entry);
    if (originalEntry) {
      originalEntry.quantity++;
      entry.quantity = originalEntry.quantity;
    }
  }

  decrementEntry(entry: DisplayEntry): void {
    const originalEntry = this.findOriginalEntry(entry);
    if (!originalEntry) return;

    if (originalEntry.quantity > 1) {
      originalEntry.quantity--;
      entry.quantity = originalEntry.quantity;
    } else {
      // Eliminar la entrada
      if (entry.variant === 'foil') {
        const index = this.collectionEntry.foilEntries.indexOf(originalEntry);
        if (index > -1) {
          this.collectionEntry.foilEntries.splice(index, 1);
        }
      } else {
        const index = this.collectionEntry.nonfoilEntries.indexOf(originalEntry);
        if (index > -1) {
          this.collectionEntry.nonfoilEntries.splice(index, 1);
        }
      }
      this.updateAllEntries();
    }
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

    // Añadir entradas foil
    this.collectionEntry.foilEntries.forEach((entry) => {
      this.allEntries.push({
        ...entry,
        displayType: 'Foil',
      });
    });

    // Añadir entradas nonfoil
    this.collectionEntry.nonfoilEntries.forEach((entry) => {
      this.allEntries.push({
        ...entry,
        displayType: 'Normal',
      });
    });
  }
}
