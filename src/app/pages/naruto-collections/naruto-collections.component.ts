import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { CardSet } from '@models/card-set.model';
import { SetListComponent } from '@components/set-list/set-list.component';
import { SelectCollectionsDialogComponent } from '@components/select-collections-dialog/select-collections-dialog.component';
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
  styleUrl: './naruto-collections.component.scss',
})
export class NarutoCollectionsComponent implements OnInit {
  narutoSets: CardSet[] = [];
  allSeriesData: NarutoSeries[] = [];

  constructor(
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadNarutoSeries();
  }

  loadNarutoSeries(): void {
    fetch('/assets/card-collection/naruto-sets.json')
      .then((response) => response.json())
      .then((data) => {
        this.allSeriesData = data.series;
        this.narutoSets = data.series.map((series: NarutoSeries) => {
          const totalCards = this.calculateTotalCards(series);
          const ownedCards = this.getOwnedCards(series.id, totalCards);

          return {
            id: series.id,
            name: series.name,
            setCode: series.id,
            cardmarketUrl: '',
            totalCards: totalCards,
            ownedCards: ownedCards,
            cardMarketExpansionId: 0,
          } as CardSet;
        });
      })
      .catch((error) => {
        console.error('Error al cargar las series de Naruto:', error);
      });
  }

  calculateTotalCards(series: NarutoSeries): number {
    return series.rarities.reduce((total, rarity) => {
      return total + (rarity.end - rarity.start + 1);
    }, 0);
  }

  getOwnedCards(seriesId: string, totalCards: number): number {
    const stored = localStorage.getItem(`naruto_collection_${seriesId}`);
    if (!stored) return 0;

    try {
      const collection = JSON.parse(stored);
      // Contar solo los valores que son true
      return Object.values(collection).filter((value) => value === true).length;
    } catch (error) {
      return 0;
    }
  }

  onSetClick(set: CardSet): void {
    this.router.navigate(['/cartas/naruto', set.id]);
  }

  goBack(): void {
    this.router.navigate(['/cartas']);
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
    // Abrir diálogo de selección
    const dialogRef = this.dialog.open(SelectCollectionsDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { series: this.allSeriesData },
    });

    dialogRef.afterClosed().subscribe((selectedSeries: NarutoSeries[]) => {
      if (!selectedSeries || selectedSeries.length === 0) {
        return; // Usuario canceló
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

    // Función para verificar y crear nueva página si es necesario
    const checkAndAddPage = (currentY: number, neededSpace: number = lineHeight): number => {
      if (currentY + neededSpace > maxY) {
        doc.addPage();
        return 20; // Resetear yPosition al inicio de la nueva página
      }
      return currentY;
    };

    // Función para calcular cuántas cartas caben en una línea
    const calculateCardsPerLine = (): number => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const sampleCardCode = 'KAYOU-NR-001';
      const cardWidth = doc.getTextWidth(sampleCardCode);
      const separatorWidth = doc.getTextWidth(' | ');
      const totalCardWidth = cardWidth + separatorWidth;
      const cardsPerLine = Math.floor((availableWidth - 10) / totalCardWidth);
      return Math.max(cardsPerLine, 3); // Mínimo 3 cartas por línea
    };

    const cardsPerLine = calculateCardsPerLine();

    selectedSeries.forEach((series) => {
      // Cada set empieza en una página nueva (excepto el primero)
      if (!isFirstSet) {
        doc.addPage();
        yPosition = 20;
      }
      isFirstSet = false;

      // Verificar espacio para el título
      yPosition = checkAndAddPage(yPosition, 10);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const setTitle = series.box ? `${series.name} (${series.box})` : series.name;
      doc.text(setTitle, 10, yPosition);
      yPosition += 10;

      // Renderizar todas las rarezas
      series.rarities.forEach((rarity) => {
        const allCards: string[] = [];

        // Generar todas las cartas de esta rareza
        for (let i = rarity.start; i <= rarity.end; i++) {
          const cardCode = this.generateCardCode(series.id, rarity.code, i);
          allCards.push(cardCode);
        }

        // Verificar espacio para el título de rareza
        yPosition = checkAndAddPage(yPosition, lineHeight * 2);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${rarity.code} (${allCards.length} cartas):`, leftColumnX, yPosition);
        yPosition += lineHeight;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        // Mostrar cartas en formato compacto
        for (let i = 0; i < allCards.length; i += cardsPerLine) {
          // Verificar espacio para cada línea de cartas
          yPosition = checkAndAddPage(yPosition, lineHeight);

          const lineCards = allCards.slice(i, i + cardsPerLine);
          const cardText = lineCards.join(' | ');

          // Verificar que el texto no sea demasiado largo para la página
          const textWidth = doc.getTextWidth(cardText);
          if (textWidth > availableWidth - 10) {
            // Si es muy largo, dividir en menos cartas por línea
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

        yPosition += 3; // Espacio entre rarezas
      });

      yPosition += 5; // Espacio adicional después de cada set
    });

    doc.save(`naruto-listado-completo-${this.formatDate(new Date())}.pdf`);
  }

  exportMissingCardsPDF(): void {
    // Abrir diálogo de selección
    const dialogRef = this.dialog.open(SelectCollectionsDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { series: this.allSeriesData },
    });

    dialogRef.afterClosed().subscribe((selectedSeries: NarutoSeries[]) => {
      if (!selectedSeries || selectedSeries.length === 0) {
        return; // Usuario canceló
      }

      this.generatePDF(selectedSeries);
    });
  }

  private generatePDF(selectedSeries: NarutoSeries[]): void {
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

    // Función para verificar y crear nueva página si es necesario
    const checkAndAddPage = (currentY: number, neededSpace: number = lineHeight): number => {
      if (currentY + neededSpace > maxY) {
        doc.addPage();
        return 20; // Resetear yPosition al inicio de la nueva página
      }
      return currentY;
    };

    // Función para calcular cuántas cartas caben en una línea
    const calculateCardsPerLine = (): number => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      // Código de carta ejemplo: "KAYOU-NR-001"
      const sampleCardCode = 'KAYOU-NR-001';
      const cardWidth = doc.getTextWidth(sampleCardCode);
      const separatorWidth = doc.getTextWidth(' | ');
      const totalCardWidth = cardWidth + separatorWidth;

      // Calcular cuántas cartas caben, considerando un pequeño margen
      const cardsPerLine = Math.floor((availableWidth - 10) / totalCardWidth);
      return Math.max(cardsPerLine, 3); // Mínimo 3 cartas por línea
    };

    const cardsPerLine = calculateCardsPerLine();

    selectedSeries.forEach((series) => {
      const stored = localStorage.getItem(`naruto_collection_${series.id}`);
      const collection = stored ? JSON.parse(stored) : {};

      // Generar lista de cartas faltantes por rareza
      const missingCards: { rarityCode: string; cards: string[] }[] = [];

      series.rarities.forEach((rarity) => {
        const missing: string[] = [];
        for (let i = rarity.start; i <= rarity.end; i++) {
          const cardCode = this.generateCardCode(series.id, rarity.code, i);
          if (!collection[cardCode]) {
            missing.push(cardCode);
          }
        }
        if (missing.length > 0) {
          missingCards.push({ rarityCode: rarity.code, cards: missing });
        }
      });

      // Si hay cartas faltantes en este set, agregarlas al PDF
      if (missingCards.length > 0) {
        // Cada set empieza en una página nueva (excepto el primero)
        if (!isFirstSet) {
          doc.addPage();
          yPosition = 20;
        }
        isFirstSet = false;

        // Verificar espacio para el título
        yPosition = checkAndAddPage(yPosition, 10);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const setTitle = series.box ? `${series.name} (${series.box})` : series.name;
        doc.text(setTitle, 10, yPosition);
        yPosition += 10;

        // Renderizar todas las rarezas en una sola columna para mejor legibilidad
        missingCards.forEach((missingRarity) => {
          // Verificar espacio para el título de rareza
          yPosition = checkAndAddPage(yPosition, lineHeight * 2);

          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`${missingRarity.rarityCode}:`, leftColumnX, yPosition);
          yPosition += lineHeight;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);

          // Mostrar cartas en formato compacto
          for (let i = 0; i < missingRarity.cards.length; i += cardsPerLine) {
            // Verificar espacio para cada línea de cartas
            yPosition = checkAndAddPage(yPosition, lineHeight);

            const lineCards = missingRarity.cards.slice(i, i + cardsPerLine);
            const cardText = lineCards.join(' | ');

            // Verificar que el texto no sea demasiado largo para la página
            const textWidth = doc.getTextWidth(cardText);
            if (textWidth > availableWidth - 10) {
              // Si es muy largo, dividir en menos cartas por línea
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

          yPosition += 3; // Espacio entre rarezas
        });

        yPosition += 5; // Espacio adicional después de cada set
      }
    });

    // Si no hay cartas faltantes
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
