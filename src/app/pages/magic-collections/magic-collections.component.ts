import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CardCollectionService } from '../../services/card-collection.service';
import { CardSet } from '@models/card-set.model';
import { SetListComponent } from '@components/set-list/set-list.component';

@Component({
  selector: 'app-magic-collections',
  standalone: true,
  imports: [SetListComponent, MatButtonModule, MatIconModule],
  templateUrl: './magic-collections.component.html',
  styleUrl: './magic-collections.component.scss',
})
export class MagicCollectionsComponent implements OnInit {
  magicSets: CardSet[] = [];

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
        });
      },
      error: (error) => {
        console.error('Error al cargar los sets de Magic:', error);
      },
    });
  }

  onSetClick(set: CardSet): void {
    this.router.navigate(['/cartas/magic', set.id]);
  }

  goBack(): void {
    this.router.navigate(['/cartas']);
  }
}
