import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CardSet } from '@models/card-set.model';

@Component({
  selector: 'app-set-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './set-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './set-list.component.scss',
})
export class SetListComponent {
  @Input() sets: CardSet[] = [];
  @Input() showCardMarket: boolean = true;
  @Output() setClicked = new EventEmitter<CardSet>();

  getProgressPercentage(set: CardSet): number {
    return set.totalCards && set.totalCards > 0 ? (set.ownedCards / set.totalCards) * 100 : 0;
  }

  onSetClick(set: CardSet): void {
    this.setClicked.emit(set);
  }
}
