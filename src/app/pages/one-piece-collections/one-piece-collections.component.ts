import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OnePieceService } from '../../services/one-piece.service';
import { OnePieceSet } from '@models/one-piece-card.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-one-piece-collections',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './one-piece-collections.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './one-piece-collections.component.scss',
})
export class OnePieceCollectionsComponent implements OnInit {
  sets: OnePieceSet[] = [];
  loading = true;

  constructor(
    private onePieceService: OnePieceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.onePieceService.getAllSets().subscribe({
      next: (sets) => {
        this.sets = sets;
        
        // Cargar el total de cartas y las cartas en colección para cada set
        this.sets.forEach((set) => {
          // Cargar cartas para obtener el total
          this.onePieceService.getSetCards(set.set_id).subscribe({
            next: (cards) => {
              set.totalCards = cards.length;
            },
            error: (error) => {
              console.error(`Error al cargar cartas para ${set.set_name}:`, error);
              set.totalCards = 0;
            },
          });

          // Cargar ownedCards desde localStorage
          const ownedCards = localStorage.getItem(`ownedCards_onepiece_${set.set_id}`);
          set.ownedCards = ownedCards ? parseInt(ownedCards, 10) : 0;
        });
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar los sets de One Piece:', error);
        this.loading = false;
      },
    });
  }

  onSetClick(set: OnePieceSet): void {
    this.router.navigate(['/onepiece', set.set_id]);
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  getProgress(set: OnePieceSet): number {
    if (!set.totalCards || set.totalCards === 0) return 0;
    return (set.ownedCards / set.totalCards) * 100;
  }
}
