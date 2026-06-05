import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/card-collection.component').then((m) => m.CardCollectionComponent),
  },
  {
    path: 'magic',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/magic-collections/magic-collections.component').then(
            (m) => m.MagicCollectionsComponent
          ),
      },
      {
        path: ':setId',
        loadComponent: () =>
          import('./pages/magic-collections/magic-set-detail/magic-set-detail.component').then(
            (m) => m.MagicSetDetailComponent
          ),
      },
    ],
  },
  {
    path: 'pokemon',
    loadComponent: () =>
      import('./pages/pokemon-collections/pokemon-collections.component').then(
        (m) => m.PokemonCollectionsComponent
      ),
  },
  {
    path: 'naruto',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/naruto-collections/naruto-collections.component').then(
            (m) => m.NarutoCollectionsComponent
          ),
      },
      {
        path: ':seriesId',
        loadComponent: () =>
          import('./pages/naruto-collections/naruto-set-detail/naruto-set-detail.component').then(
            (m) => m.NarutoSetDetailComponent
          ),
      },
    ],
  },
  {
    path: 'onepiece',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/one-piece-collections/one-piece-collections.component').then(
            (m) => m.OnePieceCollectionsComponent
          ),
      },
      {
        path: ':setId',
        loadComponent: () =>
          import('./pages/one-piece-collections/one-piece-set-detail/one-piece-set-detail.component').then(
            (m) => m.OnePieceSetDetailComponent
          ),
      },
    ],
  },
];
