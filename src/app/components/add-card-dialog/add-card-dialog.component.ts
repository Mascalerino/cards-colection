import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { Card } from '@models/card.model';
import {
  CardVariant,
  CardLanguage,
  CardCondition,
  CardEntry,
} from '@models/card-entry.model';

export interface AddCardDialogData {
  card: Card;
  variant: CardVariant;
}

@Component({
  selector: 'app-add-card-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './add-card-dialog.component.html',
  styleUrl: './add-card-dialog.component.scss',
})
export class AddCardDialogComponent {
  quantity: number = 1;
  variant: CardVariant;
  language: CardLanguage = 'en';
  condition: CardCondition = 'Near Mint';
  note: string = '';
  addAnother: boolean = false;

  languages = [
    { value: 'en', label: 'Inglés (EN)' },
    { value: 'es', label: 'Español (ES)' },
    { value: 'ja', label: 'Japonés (JA)' },
  ];

  conditions: CardCondition[] = [
    'Unspecified',
    'Mint',
    'Near Mint',
    'Lightly Played',
    'Moderately Played',
    'Heavily Played',
    'Damaged',
    'Sealed',
  ];

  constructor(
    public dialogRef: MatDialogRef<AddCardDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddCardDialogData
  ) {
    this.variant = data.variant;
  }

  get cardTitle(): string {
    return `${this.data.card.name} (${this.data.card.collector_number})`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onAdd(): void {
    const entry: CardEntry = {
      cardId: this.data.card.id,
      variant: this.variant,
      language: this.language,
      condition: this.condition,
      quantity: this.quantity,
      note: this.note || undefined,
    };

    this.dialogRef.close({ entry, addAnother: this.addAnother });
  }

  incrementQuantity(): void {
    this.quantity++;
  }

  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }
}
