import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Card } from '@models/card.model';
import { CardVariant } from '@models/card-entry.model';

@Component({
  selector: 'app-card-collection-counter',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './card-collection-counter.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './card-collection-counter.component.scss',
})
export class CardCollectionCounterComponent {
  @Input() card!: Card;
  @Input() foilCount: number = 0;
  @Input() nonfoilCount: number = 0;

  @Output() addCard = new EventEmitter<CardVariant>();
  @Output() removeCard = new EventEmitter<CardVariant>();
  @Output() openDetail = new EventEmitter<void>();

  showAddMenu: boolean = false;

  onAddClick(variant: CardVariant): void {
    this.showAddMenu = false;
    this.addCard.emit(variant);
  }

  onRemoveClick(): void {
    // Priorizar quitar de nonfoil primero, luego foil
    if (this.nonfoilCount > 0) {
      this.removeCard.emit('nonfoil');
    } else if (this.foilCount > 0) {
      this.removeCard.emit('foil');
    }
  }

  getTotalCount(): number {
    return this.foilCount + this.nonfoilCount;
  }

  toggleAddMenu(event: Event): void {
    event.stopPropagation();
    this.showAddMenu = !this.showAddMenu;
  }

  closeMenu(): void {
    this.showAddMenu = false;
  }

  onIconClick(event: Event): void {
    event.stopPropagation();
    this.openDetail.emit();
  }
}
