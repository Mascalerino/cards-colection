import { Component, Inject, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Card } from '@models/card.model';
import {
  CardEntry,
  CardCollectionEntry,
  CardLanguage,
  CardCondition,
} from '@models/card-entry.model';
import { CardSale } from '@models/card-sale.model';

export interface SellCardsDialogData {
  setId: string;
  cards: Card[];
  collection: Map<string, CardCollectionEntry>;
}

@Component({
  selector: 'app-sell-cards-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
],
  templateUrl: './sell-cards-dialog.component.html',
  styleUrl: './sell-cards-dialog.component.scss',
})
export class SellCardsDialogComponent implements OnInit {
  searchText: string = '';
  filteredCards: Card[] = [];
  selectedCard: Card | null = null;
  availableEntries: CardEntry[] = [];
  selectedEntry: CardEntry | null = null;
  saleQuantity: number = 1;
  pricePerUnit: number = 0.02;
  sessionSales: CardSale[] = [];
  csvImportErrors: string[] = [];

  cards: Card[];
  collection: Map<string, CardCollectionEntry>;
  setId: string;

  constructor(
    private dialogRef: MatDialogRef<SellCardsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SellCardsDialogData
  ) {
    this.cards = data.cards;
    this.collection = data.collection;
    this.setId = data.setId;
  }

  ngOnInit(): void {}

  onSearchChange(): void {
    if (!this.searchText.trim()) {
      this.filteredCards = [];
      return;
    }

    const searchLower = this.searchText.toLowerCase().trim();

    // Filtrar solo cartas que están en la colección
    this.filteredCards = this.cards.filter((card) => {
      const inCollection = this.collection.has(card.id);
      if (!inCollection) return false;

      const matchesName = card.name.toLowerCase().includes(searchLower);
      const matchesNumber = card.collector_number.toLowerCase().includes(searchLower);

      return matchesName || matchesNumber;
    });

    // Limitar resultados
    this.filteredCards = this.filteredCards.slice(0, 20);
  }

  selectCard(card: Card): void {
    this.selectedCard = card;
    this.availableEntries = [];
    this.selectedEntry = null;

    const collectionEntry = this.collection.get(card.id);
    if (collectionEntry) {
      // Combinar todas las entradas (foil y nonfoil)
      this.availableEntries = [
        ...collectionEntry.foilEntries.map((e) => ({ ...e })),
        ...collectionEntry.nonfoilEntries.map((e) => ({ ...e })),
      ];
    }

    // Precio por defecto
    this.pricePerUnit = 0.02;
  }

  selectEntry(entry: CardEntry): void {
    if (entry.quantity === 0) return;

    this.selectedEntry = entry;
    this.saleQuantity = 1;

    // Mantener precio por defecto al seleccionar entrada
    // El precio ya está establecido en 0.02 desde selectCard()
  }

  getCardTotalCount(cardId: string): number {
    const entry = this.collection.get(cardId);
    if (!entry) return 0;

    const foilCount = entry.foilEntries.reduce((sum, e) => sum + e.quantity, 0);
    const nonfoilCount = entry.nonfoilEntries.reduce((sum, e) => sum + e.quantity, 0);
    return foilCount + nonfoilCount;
  }

  getLanguageLabel(lang: CardLanguage): string {
    const labels: { [key: string]: string } = {
      en: 'EN',
      es: 'ES',
      ja: 'JA',
    };
    return labels[lang] || lang.toUpperCase();
  }

  canAddSale(): boolean {
    return (
      !!this.selectedCard &&
      !!this.selectedEntry &&
      this.saleQuantity > 0 &&
      this.saleQuantity <= this.selectedEntry.quantity &&
      this.pricePerUnit > 0
    );
  }

  addSale(): void {
    if (!this.canAddSale() || !this.selectedCard || !this.selectedEntry) return;

    const sale: CardSale = {
      id: this.generateSaleId(),
      cardId: this.selectedCard.id,
      cardName: this.selectedCard.name,
      collectorNumber: this.selectedCard.collector_number,
      language: this.selectedEntry.language,
      condition: this.selectedEntry.condition,
      quantity: this.saleQuantity,
      pricePerUnit: this.pricePerUnit,
      totalPrice: this.saleQuantity * this.pricePerUnit,
      saleDate: new Date().toISOString(),
      variant: this.selectedEntry.variant,
    };

    // Guardar venta
    this.saveSale(sale);

    // Actualizar colección (restar cantidad)
    this.selectedEntry.quantity -= this.saleQuantity;

    // Si la cantidad llega a 0, remover la entrada
    if (this.selectedEntry.quantity === 0) {
      this.removeEntryFromCollection(this.selectedEntry);
    }

    // Actualizar colección en el componente padre
    this.updateParentCollection();

    // Añadir a ventas de sesión
    this.sessionSales.push(sale);

    // Resetear formulario
    this.resetForm();

    // Mostrar notificación de éxito
    alert(
      `Venta registrada: ${sale.quantity}x ${sale.cardName} por ${sale.totalPrice.toFixed(2)}€`
    );
  }

  private generateSaleId(): string {
    return `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveSale(sale: CardSale): void {
    const storageKey = `sales_${this.setId}`;
    const storedData = localStorage.getItem(storageKey);
    let sales: CardSale[] = storedData ? JSON.parse(storedData) : [];

    sales.push(sale);
    localStorage.setItem(storageKey, JSON.stringify(sales));
  }

  private removeEntryFromCollection(entry: CardEntry): void {
    if (!this.selectedCard) return;

    const collectionEntry = this.collection.get(this.selectedCard.id);
    if (!collectionEntry) return;

    if (entry.variant === 'foil') {
      const index = collectionEntry.foilEntries.findIndex(
        (e) =>
          e.language === entry.language &&
          e.condition === entry.condition &&
          e.variant === entry.variant
      );
      if (index > -1) {
        collectionEntry.foilEntries.splice(index, 1);
      }
    } else {
      const index = collectionEntry.nonfoilEntries.findIndex(
        (e) =>
          e.language === entry.language &&
          e.condition === entry.condition &&
          e.variant === entry.variant
      );
      if (index > -1) {
        collectionEntry.nonfoilEntries.splice(index, 1);
      }
    }

    // Si no quedan entradas, remover de colección
    if (collectionEntry.foilEntries.length === 0 && collectionEntry.nonfoilEntries.length === 0) {
      this.collection.delete(this.selectedCard.id);
    }
  }

  private updateParentCollection(): void {
    // Guardar en localStorage
    const storageKey = `collection_${this.setId}`;
    const collectionArray: CardCollectionEntry[] = Array.from(this.collection.values());
    localStorage.setItem(storageKey, JSON.stringify(collectionArray));
  }

  private resetForm(): void {
    this.selectedCard = null;
    this.selectedEntry = null;
    this.availableEntries = [];
    this.saleQuantity = 1;
    this.pricePerUnit = 0.02;
    this.searchText = '';
    this.filteredCards = [];
  }

  getSessionTotal(): number {
    return this.sessionSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
  }

  downloadExampleCSV(): void {
    const csvContent = `numeroCarta,idioma,foil,estado,cantidad,precio
1,EN,0,NM,2,0.02
2,ES,1,NM,1,0.02
3,JA,0,NM,3,0.02`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'ejemplo_ventas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.importCSV(content);
    };

    reader.readAsText(file);
    // Resetear el input para permitir seleccionar el mismo archivo otra vez
    input.value = '';
  }

  importCSV(content: string): void {
    this.csvImportErrors = [];
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      this.csvImportErrors.push('El archivo CSV está vacío o no tiene datos');
      return;
    }

    // Validar encabezados
    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim());
    const requiredHeaders = ['numerocarta', 'idioma', 'cantidad'];
    const optionalHeaders = ['foil', 'estado', 'precio'];

    if (!requiredHeaders.every((h) => headers.includes(h))) {
      this.csvImportErrors.push(
        'El CSV debe tener al menos las columnas: numeroCarta, idioma, cantidad'
      );
      return;
    }

    const headerIndexes = {
      cardNumber: headers.indexOf('numerocarta'),
      language: headers.indexOf('idioma'),
      foil: headers.indexOf('foil'),
      condition: headers.indexOf('estado'),
      quantity: headers.indexOf('cantidad'),
      price: headers.indexOf('precio'),
    };

    let successCount = 0;
    let errorCount = 0;

    // Procesar cada línea
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v) => v.trim());

      const cardNumber = values[headerIndexes.cardNumber];
      const language = values[headerIndexes.language];
      const foilStr = headerIndexes.foil >= 0 ? values[headerIndexes.foil] : '0';
      const condition = headerIndexes.condition >= 0 ? values[headerIndexes.condition] : 'NM';
      const quantityStr = values[headerIndexes.quantity];
      const priceStr = headerIndexes.price >= 0 ? values[headerIndexes.price] : '0.02';

      // Validar y procesar
      const result = this.processCsvRow(
        cardNumber,
        language,
        foilStr,
        condition,
        quantityStr,
        priceStr,
        i + 1
      );
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        if (result.error) {
          this.csvImportErrors.push(`Línea ${i + 1}: ${result.error}`);
        }
      }
    }

    // Mostrar resumen
    const summary = `Importación completada: ${successCount} ventas registradas, ${errorCount} errores`;
    alert(summary);
  }

  private processCsvRow(
    cardNumber: string,
    language: string,
    foilStr: string,
    condition: string,
    quantityStr: string,
    priceStr: string,
    lineNumber: number
  ): { success: boolean; error?: string } {
    // Validar cantidad
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      return { success: false, error: 'cantidad inválida' };
    }

    // Validar y procesar foil (0 o 1)
    const foilValue = parseInt(foilStr, 10);
    if (isNaN(foilValue) || (foilValue !== 0 && foilValue !== 1)) {
      return { success: false, error: 'foil debe ser 0 (normal) o 1 (foil)' };
    }
    const isFoil = foilValue === 1;

    // Validar precio
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      return { success: false, error: 'precio inválido' };
    }

    // Buscar carta por número
    const card = this.findCardByNumber(cardNumber);
    if (!card) {
      return { success: false, error: `carta con número ${cardNumber} no encontrada` };
    }

    // Normalizar idioma
    const normalizedLanguage = this.normalizeLanguage(language);
    if (!normalizedLanguage) {
      return { success: false, error: `idioma "${language}" no válido (usa EN, ES, JA)` };
    }

    // Normalizar estado
    const normalizedCondition = this.normalizeCondition(condition);
    if (!normalizedCondition) {
      return { success: false, error: `estado "${condition}" no válido (usa NM, LP, MP, HP, DMG)` };
    }

    // Buscar entrada en la colección
    const entry = this.findEntry(card, normalizedLanguage, normalizedCondition, isFoil);
    if (!entry) {
      const foilText = isFoil ? 'foil' : 'normal';
      return {
        success: false,
        error: `no se encontró carta #${cardNumber} (${foilText}) en ${normalizedLanguage}/${normalizedCondition} en la colección`,
      };
    }

    // Validar stock disponible
    if (entry.quantity < quantity) {
      return {
        success: false,
        error: `stock insuficiente (disponible: ${entry.quantity}, solicitado: ${quantity})`,
      };
    }

    // Crear y guardar la venta
    const sale: CardSale = {
      id: this.generateSaleId(),
      cardId: card.id,
      cardName: card.name,
      collectorNumber: card.collector_number,
      language: normalizedLanguage,
      condition: normalizedCondition,
      quantity: quantity,
      pricePerUnit: price,
      totalPrice: quantity * price,
      saleDate: new Date().toISOString(),
      variant: entry.variant,
    };

    // Guardar venta
    this.saveSale(sale);

    // Actualizar colección (restar cantidad)
    entry.quantity -= quantity;

    // Si la cantidad llega a 0, remover la entrada
    if (entry.quantity === 0) {
      this.removeEntryFromCollectionByCard(card, entry);
    }

    // Añadir a ventas de sesión
    this.sessionSales.push(sale);

    return { success: true };
  }

  private findCardByNumber(cardNumber: string): Card | null {
    return this.cards.find((c) => c.collector_number === cardNumber) || null;
  }

  private normalizeLanguage(lang: string): CardLanguage | null {
    const langUpper = lang.toUpperCase();
    const validLanguages: CardLanguage[] = ['en', 'es', 'ja'];
    const langMap: { [key: string]: CardLanguage } = {
      EN: 'en',
      ES: 'es',
      JA: 'ja',
      JP: 'ja', // Alias
    };
    return langMap[langUpper] || null;
  }

  private normalizeCondition(condition: string): CardCondition | null {
    const condUpper = condition.toUpperCase();
    const conditionMap: { [key: string]: CardCondition } = {
      NM: 'Near Mint',
      LP: 'Lightly Played',
      MP: 'Moderately Played',
      HP: 'Heavily Played',
      DMG: 'Damaged',
      M: 'Mint',
      MINT: 'Mint',
      'NEAR MINT': 'Near Mint',
      'LIGHTLY PLAYED': 'Lightly Played',
      'MODERATELY PLAYED': 'Moderately Played',
      'HEAVILY PLAYED': 'Heavily Played',
      DAMAGED: 'Damaged',
      SEALED: 'Sealed',
    };
    return conditionMap[condUpper] || null;
  }

  private findEntry(
    card: Card,
    language: CardLanguage,
    condition: CardCondition,
    isFoil: boolean
  ): CardEntry | null {
    const collectionEntry = this.collection.get(card.id);
    if (!collectionEntry) return null;

    // Buscar solo en foil o nonfoil según el parámetro
    const entries = isFoil ? collectionEntry.foilEntries : collectionEntry.nonfoilEntries;

    return (
      entries.find((e) => e.language === language && e.condition === condition && e.quantity > 0) ||
      null
    );
  }

  private removeEntryFromCollectionByCard(card: Card, entry: CardEntry): void {
    const collectionEntry = this.collection.get(card.id);
    if (!collectionEntry) return;

    if (entry.variant === 'foil') {
      const index = collectionEntry.foilEntries.findIndex(
        (e) =>
          e.language === entry.language &&
          e.condition === entry.condition &&
          e.variant === entry.variant
      );
      if (index > -1) {
        collectionEntry.foilEntries.splice(index, 1);
      }
    } else {
      const index = collectionEntry.nonfoilEntries.findIndex(
        (e) =>
          e.language === entry.language &&
          e.condition === entry.condition &&
          e.variant === entry.variant
      );
      if (index > -1) {
        collectionEntry.nonfoilEntries.splice(index, 1);
      }
    }

    // Si no quedan entradas, remover de colección
    if (collectionEntry.foilEntries.length === 0 && collectionEntry.nonfoilEntries.length === 0) {
      this.collection.delete(card.id);
    }

    // Actualizar en localStorage
    this.updateParentCollection();
  }

  close(): void {
    this.dialogRef.close(this.sessionSales.length > 0);
  }
}
