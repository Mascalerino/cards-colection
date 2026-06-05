import { Component, Output, EventEmitter, Input } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';

export interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-card-search',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatRadioModule,
    MatCheckboxModule
],
  templateUrl: './card-search.component.html',
  styleUrl: './card-search.component.scss',
})
export class CardSearchComponent {
  @Input() placeholder: string = 'Nombre de la carta...';
  @Input() label: string = 'Buscar cartas';
  @Input() showFilters: boolean = true;
  @Input() showVariantFilters: boolean = false;
  @Input() filteredCount: number = 0;
  @Input() totalCount: number = 0;
  @Input() filterOptions: FilterOption[] = [
    { value: 'all', label: 'Todas' },
    { value: 'inCollection', label: 'En colección' },
    { value: 'notInCollection', label: 'No en colección' },
  ];

  searchText: string = '';
  selectedFilter: string = 'all';
  filterFoil: boolean = false;
  filterNonfoil: boolean = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<string>();
  @Output() variantFilterChange = new EventEmitter<{ foil: boolean; nonfoil: boolean }>();

  onSearchChange(): void {
    this.searchChange.emit(this.searchText);
  }

  onFilterChange(): void {
    this.filterChange.emit(this.selectedFilter);
    // Resetear filtros de variante si se selecciona "Todas"
    if (this.selectedFilter === 'all') {
      this.filterFoil = false;
      this.filterNonfoil = false;
      this.onVariantFilterChange();
    }
  }

  onVariantFilterChange(): void {
    this.variantFilterChange.emit({
      foil: this.filterFoil,
      nonfoil: this.filterNonfoil,
    });
  }

  clearSearch(): void {
    this.searchText = '';
    this.searchChange.emit(this.searchText);
  }
}
