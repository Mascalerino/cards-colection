import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/card-collection.component').then((m) => m.CardCollectionComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'magic',
    canActivate: [authGuard],
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
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pokemon-collections/pokemon-collections.component').then(
        (m) => m.PokemonCollectionsComponent
      ),
  },
  {
    path: 'naruto',
    canActivate: [authGuard],
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
    canActivate: [authGuard],
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
