import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

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

export interface SelectCollectionsDialogData {
  series: NarutoSeries[];
}

@Component({
  selector: 'app-select-collections-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatDividerModule,
  ],
  templateUrl: './select-collections-dialog.component.html',
  styleUrl: './select-collections-dialog.component.scss',
})
export class SelectCollectionsDialogComponent {
  series: NarutoSeries[];
  selectedSeries: boolean[] = [];
  selectAll: boolean = true;

  constructor(
    private dialogRef: MatDialogRef<SelectCollectionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SelectCollectionsDialogData
  ) {
    this.series = data.series;
    // Seleccionar todas por defecto
    this.selectedSeries = new Array(this.series.length).fill(true);
  }

  onSelectAllChange(): void {
    this.selectedSeries = this.selectedSeries.map(() => this.selectAll);
  }

  onSelectionChange(): void {
    // Actualizar el estado de "seleccionar todas"
    this.selectAll = this.selectedSeries.every((selected) => selected);
  }

  getSelectedCount(): number {
    return this.selectedSeries.filter((selected) => selected).length;
  }

  confirm(): void {
    const selected = this.series.filter((_, index) => this.selectedSeries[index]);
    this.dialogRef.close(selected);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}
