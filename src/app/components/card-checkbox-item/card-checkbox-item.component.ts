import { Component, Input, Output, EventEmitter } from '@angular/core';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-card-checkbox-item',
  standalone: true,
  imports: [MatCheckboxModule, FormsModule],
  templateUrl: './card-checkbox-item.component.html',
  styleUrl: './card-checkbox-item.component.scss',
})
export class CardCheckboxItemComponent {
  @Input() cardCode: string = '';
  @Input() isOwned: boolean = false;
  @Output() toggleOwned = new EventEmitter<{ cardCode: string; isOwned: boolean }>();

  onCodeClick(): void {
    this.isOwned = !this.isOwned;
    this.toggleOwned.emit({ cardCode: this.cardCode, isOwned: this.isOwned });
  }

  onToggle(): void {
    this.toggleOwned.emit({ cardCode: this.cardCode, isOwned: this.isOwned });
  }
}
