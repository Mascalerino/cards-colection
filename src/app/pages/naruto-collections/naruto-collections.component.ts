import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { CardSet } from '@models/card-set.model';
import { SetListComponent } from '@components/set-list/set-list.component';
import { SelectCollectionsDialogComponent } from '@components/select-collections-dialog/select-collections-dialog.component';
import { CollectionApiService } from '@services/collection-api.service';
import jsPDF from 'jspdf';

interface NarutoSeries {
  id: string;
  name: string;
  box?: string;
  rarities: {
    code: string;
    start: number;
    end: number;
  }[];
}

@Component({
  selector: 'app-naruto-collections',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, SetListComponent],
  templateUrl: './naruto-collections.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './naruto-collections.component.scss',
})
export class NarutoCollectionsComponent implements OnInit {
  narutoSets: CardSet[] = [];
  allSeriesData: NarutoSeries[] = [];

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private collectionApi: CollectionApiService,
  ) {}

  ngOnInit(): void {
    this.loadNarutoSeries();
  }

  loadNarutoSeries(): void {
    this.collectionApi.getSets('naruto').subscribe({
      next: (sets) => {
        this.allSeriesData = sets.map((set) => {
          const extra = (set.extra ?? {}) as { box?: string; rarities?: NarutoSeries['rarities'] };
          return { id: set.externalId, name: set.name, box: extra.box, rarities: extra.rarities ?? [] };
        });

        this.narutoSets = this.allSeriesData.map((series) => {
          const totalCards = this.calculateTotalCards(series);
          return {
            id: series.id,
            name: series.name,
            setCode: series.id,
            cardmarketUrl: '',
            totalCards,
            ownedCards: 0,
            cardMarketExpansionId: 0,
          } as CardSet;
        });

        this.narutoSets.forEach((set) => this.loadOwnedCount(set));
      },
      error: (error) => {
        console.error('Error al cargar las series de Naruto:', error);
      },
    });
  }

  private loadOwnedCount(set: CardSet): void {
    this.collectionApi.getCollection('naruto', set.id).subscribe({
      next: (entries) => {
        set.ownedCards = entries.filter((e) => e.quantity > 0).length;
      },
      error: (error) => console.error(`Error al cargar la colección de ${set.id}:`, error),
    });
  }

  calculateTotalCards(series: NarutoSeries): number {
    return series.rarities.reduce((total, rarity) => {
      return total + (rarity.end - rarity.start + 1);
    }, 0);
  }

  onSetClick(set: CardSet): void {
    this.router.navigate(['/naruto', set.id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  generateCardCode(seriesId: string, rarityCode: string, number: number): string {
    const paddedNumber = number.toString().padStart(3, '0');
    return `${seriesId}-${rarityCode}-${paddedNumber}`;
  }

  formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  exportAllCardsPDF(): void {
    const dialogRef = this.dialog.open(SelectCollectionsDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { series: this.allSeriesData },
    });

    dialogRef.afterClosed().subscribe((selectedSeries: NarutoSeries[]) => {
      if (!selectedSeries || selectedSeries.length === 0) {
        return;
      }

      this.generateAllCardsPDF(selectedSeries);
    });
  }

  private generateAllCardsPDF(selectedSeries: NarutoSeries[]): void {
    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxY = pageHeight - margin;
    const leftColumnX = 10;
    const availableWidth = pageWidth - 2 * margin;

    doc.setFontSize(16);
    doc.text('Listado Completo de Cartas de Naruto', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    let isFirstSet = true;

    const checkAndAddPage = (currentY: number, neededSpace: number = lineHeight): number => {
      if (currentY + neededSpace > maxY) {
        doc.addPage();
        return 20;
      }
      return currentY;
    };

    const calculateCardsPerLine = (): number => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const sampleCardCode = 'KAYOU-NR-001';
      const cardWidth = doc.getTextWidth(sampleCardCode);
      const separatorWidth = doc.getTextWidth(' | ');
      const totalCardWidth = cardWidth + separatorWidth;
      const cardsPerLine = Math.floor((availableWidth - 10) / totalCardWidth);
      return Math.max(cardsPerLine, 3);
    };

    const cardsPerLine = calculateCardsPerLine();

    selectedSeries.forEach((series) => {
      if (!isFirstSet) {
        doc.addPage();
        yPosition = 20;
      }
      isFirstSet = false;

      yPosition = checkAndAddPage(yPosition, 10);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const setTitle = series.box ? `${series.name} (${series.box})` : series.name;
      doc.text(setTitle, 10, yPosition);
      yPosition += 10;

      series.rarities.forEach((rarity) => {
        const allCards: string[] = [];

        for (let i = rarity.start; i <= rarity.end; i++) {
          const cardCode = this.generateCardCode(series.id, rarity.code, i);
          allCards.push(cardCode);
        }

        yPosition = checkAndAddPage(yPosition, lineHeight * 2);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${rarity.code} (${allCards.length} cartas):`, leftColumnX, yPosition);
        yPosition += lineHeight;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        for (let i = 0; i < allCards.length; i += cardsPerLine) {
          yPosition = checkAndAddPage(yPosition, lineHeight);

          const lineCards = allCards.slice(i, i + cardsPerLine);
          const cardText = lineCards.join(' | ');

          const textWidth = doc.getTextWidth(cardText);
          if (textWidth > availableWidth - 10) {
            const halfLine = Math.floor(lineCards.length / 2);
            const firstHalf = lineCards.slice(0, halfLine).join(' | ');
            const secondHalf = lineCards.slice(halfLine).join(' | ');

            doc.text(firstHalf, leftColumnX + 2, yPosition);
            yPosition += lineHeight;
            yPosition = checkAndAddPage(yPosition, lineHeight);
            doc.text(secondHalf, leftColumnX + 2, yPosition);
            yPosition += lineHeight;
          } else {
            doc.text(cardText, leftColumnX + 2, yPosition);
            yPosition += lineHeight;
          }
        }

        yPosition += 3;
      });

      yPosition += 5;
    });

    doc.save(`naruto-listado-completo-${this.formatDate(new Date())}.pdf`);
  }

  exportMissingCardsPDF(): void {
    const dialogRef = this.dialog.open(SelectCollectionsDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { series: this.allSeriesData },
    });

    dialogRef.afterClosed().subscribe((selectedSeries: NarutoSeries[]) => {
      if (!selectedSeries || selectedSeries.length === 0) {
        return;
      }

      const collectionRequests = selectedSeries.length
        ? selectedSeries.map((series) => this.collectionApi.getCollection('naruto', series.id))
        : [of([])];

      forkJoin(collectionRequests).subscribe((allEntries) => {
        const ownedBySeriesId = new Map<string, Set<string>>();
        selectedSeries.forEach((series, index) => {
          const owned = new Set(
            allEntries[index].filter((e) => e.quantity > 0).map((e) => e.cardId),
          );
          ownedBySeriesId.set(series.id, owned);
        });

        this.generatePDF(selectedSeries, ownedBySeriesId);
      });
    });
  }

  private generatePDF(selectedSeries: NarutoSeries[], ownedBySeriesId: Map<string, Set<string>>): void {
    const doc = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const maxY = pageHeight - margin;
    const leftColumnX = 10;
    const availableWidth = pageWidth - 2 * margin;

    doc.setFontSize(16);
    doc.text('Cartas Faltantes de Naruto', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    let isFirstSet = true;

    const checkAndAddPage = (currentY: number, neededSpace: number = lineHeight): number => {
      if (currentY + neededSpace > maxY) {
        doc.addPage();
        return 20;
      }
      return currentY;
    };

    const calculateCardsPerLine = (): number => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const sampleCardCode = 'KAYOU-NR-001';
      const cardWidth = doc.getTextWidth(sampleCardCode);
      const separatorWidth = doc.getTextWidth(' | ');
      const totalCardWidth = cardWidth + separatorWidth;

      const cardsPerLine = Math.floor((availableWidth - 10) / totalCardWidth);
      return Math.max(cardsPerLine, 3);
    };

    const cardsPerLine = calculateCardsPerLine();

    selectedSeries.forEach((series) => {
      const owned = ownedBySeriesId.get(series.id) ?? new Set<string>();

      const missingCards: { rarityCode: string; cards: string[] }[] = [];

      series.rarities.forEach((rarity) => {
        const missing: string[] = [];
        for (let i = rarity.start; i <= rarity.end; i++) {
          const cardCode = this.generateCardCode(series.id, rarity.code, i);
          if (!owned.has(cardCode)) {
            missing.push(cardCode);
          }
        }
        if (missing.length > 0) {
          missingCards.push({ rarityCode: rarity.code, cards: missing });
        }
      });

      if (missingCards.length > 0) {
        if (!isFirstSet) {
          doc.addPage();
          yPosition = 20;
        }
        isFirstSet = false;

        yPosition = checkAndAddPage(yPosition, 10);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const setTitle = series.box ? `${series.name} (${series.box})` : series.name;
        doc.text(setTitle, 10, yPosition);
        yPosition += 10;

        missingCards.forEach((missingRarity) => {
          yPosition = checkAndAddPage(yPosition, lineHeight * 2);

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${missingRarity.rarityCode}:`, leftColumnX, yPosition);
          yPosition += lineHeight;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);

          for (let i = 0; i < missingRarity.cards.length; i += cardsPerLine) {
            yPosition = checkAndAddPage(yPosition, lineHeight);

            const lineCards = missingRarity.cards.slice(i, i + cardsPerLine);
            const cardText = lineCards.join(' | ');

            const textWidth = doc.getTextWidth(cardText);
            if (textWidth > availableWidth - 10) {
              const halfLine = Math.floor(lineCards.length / 2);
              const firstHalf = lineCards.slice(0, halfLine).join(' | ');
              const secondHalf = lineCards.slice(halfLine).join(' | ');

              doc.text(firstHalf, leftColumnX + 2, yPosition);
              yPosition += lineHeight;
              yPosition = checkAndAddPage(yPosition, lineHeight);
              doc.text(secondHalf, leftColumnX + 2, yPosition);
              yPosition += lineHeight;
            } else {
              doc.text(cardText, leftColumnX + 2, yPosition);
              yPosition += lineHeight;
            }
          }

          yPosition += 3;
        });

        yPosition += 5;
      }
    });

    if (isFirstSet) {
      doc.setFontSize(12);
      doc.text(
        '¡Felicidades! No te faltan cartas en las colecciones seleccionadas.',
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );
    }

    doc.save(`naruto-cartas-faltantes-${this.formatDate(new Date())}.pdf`);
  }
}
