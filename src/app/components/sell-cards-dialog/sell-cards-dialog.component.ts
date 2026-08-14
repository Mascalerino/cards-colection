import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { Card } from '@models/card.model';
import {
  CardEntry,
  CardCollectionEntry,
  CardLanguage,
  CardCondition,
} from '@models/card-entry.model';
import { CardSale } from '@models/card-sale.model';
import { CollectionApiService } from '@services/collection-api.service';
import { SalesApiService } from '@services/sales-api.service';

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
  changeDetection: ChangeDetectionStrategy.Default,
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
  saving: boolean = false;

  cards: Card[];
  collection: Map<string, CardCollectionEntry>;
  setId: string;

  constructor(
    private dialogRef: MatDialogRef<SellCardsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SellCardsDialogData,
    private collectionApi: CollectionApiService,
    private salesApi: SalesApiService,
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

    this.filteredCards = this.cards.filter((card) => {
      const inCollection = this.collection.has(card.id);
      if (!inCollection) return false;

      const matchesName = card.name.toLowerCase().includes(searchLower);
      const matchesNumber = card.collector_number.toLowerCase().includes(searchLower);

      return matchesName || matchesNumber;
    });

    this.filteredCards = this.filteredCards.slice(0, 20);
  }

  selectCard(card: Card): void {
    this.selectedCard = card;
    this.availableEntries = [];
    this.selectedEntry = null;

    const collectionEntry = this.collection.get(card.id);
    if (collectionEntry) {
      this.availableEntries = [
        ...collectionEntry.foilEntries.map((e) => ({ ...e })),
        ...collectionEntry.nonfoilEntries.map((e) => ({ ...e })),
      ];
    }

    this.pricePerUnit = 0.02;
  }

  selectEntry(entry: CardEntry): void {
    if (entry.quantity === 0) return;
    this.selectedEntry = entry;
    this.saleQuantity = 1;
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
      !this.saving &&
      !!this.selectedCard &&
      !!this.selectedEntry &&
      this.saleQuantity > 0 &&
      this.saleQuantity <= this.selectedEntry.quantity &&
      this.pricePerUnit > 0
    );
  }

  async addSale(): Promise<void> {
    if (!this.canAddSale() || !this.selectedCard || !this.selectedEntry) return;

    const card = this.selectedCard;
    const entry = this.selectedEntry;
    const quantity = this.saleQuantity;
    const totalPrice = quantity * this.pricePerUnit;

    this.saving = true;
    try {
      const sale = await this.registerSale(card, entry, quantity, this.pricePerUnit, totalPrice);
      this.sessionSales.push(sale);
      this.resetForm();
      alert(`Venta registrada: ${sale.quantity}x ${sale.cardName} por ${sale.totalPrice.toFixed(2)}€`);
    } catch (error) {
      console.error('Error al registrar la venta:', error);
      alert('Error al registrar la venta. Inténtalo de nuevo.');
    } finally {
      this.saving = false;
    }
  }

  /** Crea la venta en el backend y decrementa la colección; devuelve la venta creada. */
  private async registerSale(
    card: Card,
    entry: CardEntry,
    quantity: number,
    pricePerUnit: number,
    totalPrice: number,
  ): Promise<CardSale> {
    const created = await firstValueFrom(
      this.salesApi.createSale({
        setId: this.setId,
        cardExternalId: card.id,
        cardName: card.name,
        collectorNumber: card.collector_number,
        language: entry.language,
        condition: entry.condition,
        variant: entry.variant,
        quantity,
        pricePerUnit,
        totalPrice,
        saleDate: new Date().toISOString(),
      }),
    );

    const newQuantity = entry.quantity - quantity;
    await firstValueFrom(
      this.collectionApi.upsertEntry('magic', this.setId, card.id, {
        variant: entry.variant,
        language: entry.language,
        condition: entry.condition,
        quantity: newQuantity,
      }),
    );

    entry.quantity = newQuantity;
    if (newQuantity <= 0) {
      this.removeEntryFromCollectionByCard(card, entry);
    }

    return {
      id: created.id,
      cardId: card.id,
      cardName: card.name,
      collectorNumber: card.collector_number,
      language: entry.language,
      condition: entry.condition,
      quantity,
      pricePerUnit,
      totalPrice,
      saleDate: created.saleDate,
      variant: entry.variant,
    };
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
    input.value = '';
  }

  async importCSV(content: string): Promise<void> {
    this.csvImportErrors = [];
    const lines = content.split('\n').filter((line) => line.trim());

    if (lines.length < 2) {
      this.csvImportErrors.push('El archivo CSV está vacío o no tiene datos');
      return;
    }

    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim());
    const requiredHeaders = ['numerocarta', 'idioma', 'cantidad'];

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
    this.saving = true;

    // Procesar secuencialmente: cada fila puede afectar al stock que valida la siguiente
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

      const result = await this.processCsvRow(
        cardNumber,
        language,
        foilStr,
        condition,
        quantityStr,
        priceStr,
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

    this.saving = false;
    alert(`Importación completada: ${successCount} ventas registradas, ${errorCount} errores`);
  }

  private async processCsvRow(
    cardNumber: string,
    language: string,
    foilStr: string,
    condition: string,
    quantityStr: string,
    priceStr: string,
  ): Promise<{ success: boolean; error?: string }> {
    const quantity = parseInt(quantityStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      return { success: false, error: 'cantidad inválida' };
    }

    const foilValue = parseInt(foilStr, 10);
    if (isNaN(foilValue) || (foilValue !== 0 && foilValue !== 1)) {
      return { success: false, error: 'foil debe ser 0 (normal) o 1 (foil)' };
    }
    const isFoil = foilValue === 1;

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      return { success: false, error: 'precio inválido' };
    }

    const card = this.findCardByNumber(cardNumber);
    if (!card) {
      return { success: false, error: `carta con número ${cardNumber} no encontrada` };
    }

    const normalizedLanguage = this.normalizeLanguage(language);
    if (!normalizedLanguage) {
      return { success: false, error: `idioma "${language}" no válido (usa EN, ES, JA)` };
    }

    const normalizedCondition = this.normalizeCondition(condition);
    if (!normalizedCondition) {
      return { success: false, error: `estado "${condition}" no válido (usa NM, LP, MP, HP, DMG)` };
    }

    const entry = this.findEntry(card, normalizedLanguage, normalizedCondition, isFoil);
    if (!entry) {
      const foilText = isFoil ? 'foil' : 'normal';
      return {
        success: false,
        error: `no se encontró carta #${cardNumber} (${foilText}) en ${normalizedLanguage}/${normalizedCondition} en la colección`,
      };
    }

    if (entry.quantity < quantity) {
      return {
        success: false,
        error: `stock insuficiente (disponible: ${entry.quantity}, solicitado: ${quantity})`,
      };
    }

    try {
      const sale = await this.registerSale(card, entry, quantity, price, quantity * price);
      this.sessionSales.push(sale);
      return { success: true };
    } catch (error) {
      console.error('Error al registrar venta desde CSV:', error);
      return { success: false, error: 'error al guardar la venta en el servidor' };
    }
  }

  private findCardByNumber(cardNumber: string): Card | null {
    return this.cards.find((c) => c.collector_number === cardNumber) || null;
  }

  private normalizeLanguage(lang: string): CardLanguage | null {
    const langUpper = lang.toUpperCase();
    const langMap: { [key: string]: CardLanguage } = {
      EN: 'en',
      ES: 'es',
      JA: 'ja',
      JP: 'ja',
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

    const entries = isFoil ? collectionEntry.foilEntries : collectionEntry.nonfoilEntries;

    return (
      entries.find((e) => e.language === language && e.condition === condition && e.quantity > 0) ||
      null
    );
  }

  private removeEntryFromCollectionByCard(card: Card, entry: CardEntry): void {
    const collectionEntry = this.collection.get(card.id);
    if (!collectionEntry) return;

    const list = entry.variant === 'foil' ? collectionEntry.foilEntries : collectionEntry.nonfoilEntries;
    const index = list.findIndex(
      (e) => e.language === entry.language && e.condition === entry.condition && e.variant === entry.variant
    );
    if (index > -1) {
      list.splice(index, 1);
    }

    if (collectionEntry.foilEntries.length === 0 && collectionEntry.nonfoilEntries.length === 0) {
      this.collection.delete(card.id);
    }
  }

  close(): void {
    this.dialogRef.close(this.sessionSales.length > 0);
  }
}
