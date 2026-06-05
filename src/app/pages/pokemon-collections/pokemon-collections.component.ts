import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CardCollectionService } from '../../services/card-collection.service';
import { CardSet } from '@models/card-set.model';
import { SetListComponent } from '@components/set-list/set-list.component';

@Component({
  selector: 'app-pokemon-collections',
  standalone: true,
  imports: [SetListComponent, MatButtonModule, MatIconModule],
  templateUrl: './pokemon-collections.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pokemon-collections.component.scss',
})
export class PokemonCollectionsComponent implements OnInit {
  pokemonSets: CardSet[] = [];

  constructor(
    private cardCollectionService: CardCollectionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cardCollectionService.getPokemonSets().subscribe({
      next: (sets) => {
        this.pokemonSets = sets;
      },
      error: (error) => {
        console.error('Error al cargar los sets de Pokémon:', error);
      },
    });
  }

  onSetClick(set: CardSet): void {
    // TODO: Navegar al detalle del set
    console.log('Set clickeado:', set);
  }

  goBack(): void {
    this.router.navigate(['/cartas']);
  }
}
