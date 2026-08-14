import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CardCollectionService } from '../../services/card-collection.service';
import { CollectionApiService } from '../../services/collection-api.service';
import { CardSet } from '@models/card-set.model';
import { Card } from '@models/card.model';
import { SetListComponent } from '@components/set-list/set-list.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-magic-collections',
  standalone: true,
  imports: [CommonModule, SetListComponent, MatButtonModule, MatIconModule],
  templateUrl: './magic-collections.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './magic-collections.component.scss',
})
export class MagicCollectionsComponent implements OnInit {
  magicSets: CardSet[] = [];
  totalCollectionValue: number = 0;

  constructor(
    private cardCollectionService: CardCollectionService,
    private collectionApi: CollectionApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cardCollectionService.getMagicSets().subscribe({
      next: (sets) => {
        this.magicSets = sets;
        this.totalCollectionValue = 0;
        this.magicSets.forEach((set) => this.loadSetProgressAndValue(set));
      },
      error: (error) => {
        console.error('Error al cargar los sets de Magic:', error);
      },
    });
  }

  private loadSetProgressAndValue(set: CardSet): void {
    this.cardCollectionService.getMagicSetCards(set.id).subscribe({
      next: (response) => {
        set.totalCards = response.totalCards;
        this.calculateSetValue(set, response.cards);
      },
      error: (error) => {
        console.error(`Error al cargar cartas para ${set.name}:`, error);
        set.totalCards = 0;
      },
    });
  }

  private calculateSetValue(set: CardSet, cards: Card[]): void {
    this.collectionApi.getCollection('magic', set.id).subscribe({
      next: (entries) => {
        set.ownedCards = new Set(entries.map((e) => e.cardId)).size;

        let setTotal = 0;
        entries.forEach((entry) => {
          const card = cards.find((c) => c.id === entry.cardId);
          if (!card) return;

          const price = entry.variant === 'foil' ? card.prices?.eur_foil : card.prices?.eur;
          if (price) {
            const parsed = parseFloat(price);
            if (!isNaN(parsed)) setTotal += parsed * entry.quantity;
          }
        });

        this.totalCollectionValue += setTotal;
      },
      error: (error) => {
        console.error(`Error al obtener la colección del set ${set.id}:`, error);
      },
    });
  }

  onSetClick(set: CardSet): void {
    this.router.navigate(['/magic', set.id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
