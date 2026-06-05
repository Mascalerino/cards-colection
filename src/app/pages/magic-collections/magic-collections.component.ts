import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CardCollectionService } from '../../services/card-collection.service';
import { CardSet } from '@models/card-set.model';
import { SetListComponent } from '@components/set-list/set-list.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-magic-collections',
  standalone: true,
  imports: [CommonModule, SetListComponent, MatButtonModule, MatIconModule],
  templateUrl: './magic-collections.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './magic-collections.component.scss',
})
export class MagicCollectionsComponent implements OnInit {
  magicSets: CardSet[] = [];
  totalCollectionValue: number = 0;

  constructor(
    private cardCollectionService: CardCollectionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cardCollectionService.getMagicSets().subscribe({
      next: (sets) => {
        this.magicSets = sets;
        // Cargar el total de cartas y las cartas en colección para cada set
        this.magicSets.forEach((set) => {
          this.cardCollectionService.getMagicSetCards(set.setCode).subscribe({
            next: (response) => {
              set.totalCards = response.totalCards;
            },
            error: (error) => {
              console.error(`Error al cargar total de cartas para ${set.name}:`, error);
              set.totalCards = 0;
            },
          });

          // Cargar ownedCards desde localStorage
          const ownedCards = localStorage.getItem(`ownedCards_${set.id}`);
          set.ownedCards = ownedCards ? parseInt(ownedCards, 10) : 0;

          // Calcular valor de la colección de este set
          this.calculateSetValue(set.id);
        });
      },
      error: (error) => {
        console.error('Error al cargar los sets de Magic:', error);
      },
    });
  }

  calculateSetValue(setId: string): void {
    const collectionKey = `collection_${setId}`;
    const collectionData = localStorage.getItem(collectionKey);
    
    if (!collectionData) return;

    try {
      const collection = JSON.parse(collectionData);
      
      this.cardCollectionService.getMagicSetCards(setId).subscribe({
        next: (response) => {
          const cards = response.cards;
          let setTotal = 0;

          collection.forEach((collectionCard: any) => {
            const card = cards.find((c: any) => c.id === collectionCard.cardId);
            if (!card) return;

            // Calcular valor de foils
            if (collectionCard.foilEntries && collectionCard.foilEntries.length > 0) {
              collectionCard.foilEntries.forEach((entry: any) => {
                if (card.prices?.eur_foil) {
                  const price = parseFloat(card.prices.eur_foil);
                  if (!isNaN(price)) {
                    setTotal += price * entry.quantity;
                  }
                }
              });
            }

            // Calcular valor de non-foils
            if (collectionCard.nonfoilEntries && collectionCard.nonfoilEntries.length > 0) {
              collectionCard.nonfoilEntries.forEach((entry: any) => {
                if (card.prices?.eur) {
                  const price = parseFloat(card.prices.eur);
                  if (!isNaN(price)) {
                    setTotal += price * entry.quantity;
                  }
                }
              });
            }
          });

          this.totalCollectionValue += setTotal;
        }
      });
    } catch (error) {
      console.error(`Error al calcular valor del set ${setId}:`, error);
    }
  }

  onSetClick(set: CardSet): void {
    this.router.navigate(['/magic', set.id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
