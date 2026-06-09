# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos principales

```bash
# Servidor de desarrollo (proxy incluido via angular.json)
npm start

# Build de producción
npm run build

# Tests (Karma + Jasmine)
npm test

# Generar un componente nuevo
ng generate component components/nombre-componente --standalone
```

El proxy (`proxy.conf.json`) está configurado en `angular.json`, así que `npm start` ya lo incluye. Las peticiones a `/api` se redirigen a `https://optcgapi.com` para evitar CORS en One Piece.

## Arquitectura general

Aplicación Angular 22 con **componentes standalone** (sin módulos NgModule). Todos los componentes usan `ChangeDetectionStrategy.Eager` y se cargan de forma **lazy** mediante `loadComponent` en el router.

### Rutas y páginas

| Ruta | Componente | Datos |
|---|---|---|
| `/` | `CardCollectionComponent` | Menú principal + export/import |
| `/magic` | `MagicCollectionsComponent` | Lista de sets desde JSON local |
| `/magic/:setId` | `MagicSetDetailComponent` | Cartas via Scryfall API |
| `/pokemon` | `PokemonCollectionsComponent` | Sets desde JSON local |
| `/naruto` | `NarutoCollectionsComponent` | Sets desde JSON local |
| `/naruto/:seriesId` | `NarutoSetDetailComponent` | — |
| `/onepiece` | `OnePieceCollectionsComponent` | Sets via optcgapi.com (caché) |
| `/onepiece/:setId` | `OnePieceSetDetailComponent` | Cartas via optcgapi.com (caché) |

### Servicios

- **`CardCollectionService`**: Gestiona Magic y Pokémon. Carga sets desde JSONs locales en `src/assets/card-collection/`. Obtiene cartas de Magic paginando la Scryfall API (`/cards/search`). El set `fin`/`finx` (Final Fantasy) tiene lógica especial para separar cartas por número de colección (≤309 = `fin`, ≥310 = `finx`).

- **`OnePieceService`**: Accede a `optcgapi.com` a través del proxy `/api`. Implementa **caché en localStorage con TTL de 7 días** para todos los datos (sets, decks y cartas). Expone también métodos para gestionar la colección del usuario directamente (add/remove/clear).

### Persistencia (localStorage)

Toda la colección del usuario vive en localStorage. Claves por juego:

| Prefijo | Juego |
|---|---|
| `collection_{setId}` | Magic: The Gathering |
| `naruto_collection_{seriesId}` | Naruto |
| `pokemon_collection_{setId}` | Pokémon |
| `onepiece_collection_{setId}` | One Piece |
| `ownedCards_{setId}` | Contador de cartas únicas (todos los juegos) |
| `sales_{setId}` | Historial de ventas (Magic) |
| `onepiece_all_sets` / `onepiece_all_decks` | Caché de listas de sets/decks |
| `onepiece_cards_{setId}` | Caché de cartas de un set |

La página principal permite **exportar e importar** todas las colecciones a/desde un archivo JSON. Al añadir un nuevo juego, hay que registrar su prefijo en `COLLECTION_PREFIXES` en `card-collection.component.ts`.

### Modelos de datos

- **Magic**: `Card` (con `foil`/`nonfoil`, `prices` en EUR, `cardmarket_id`). Las entradas de colección son `CardCollectionEntry` con arrays separados de `foilEntries` y `nonfoilEntries`, cada uno con idioma (`en`/`es`/`ja`), condición y cantidad. Esto permite exportar duplicados como CSV compatible con Cardmarket.
- **One Piece**: `OnePieceCard` con `card_set_id` como identificador único (ej: `OP01-077`). La colección almacena `OnePieceCardEntry` con solo `cardId` y `quantity`.

### Alias de paths TypeScript

Configurados en `tsconfig.json` para evitar rutas relativas largas:

```
@models/*    → src/app/models/*
@services/*  → src/app/services/*
@components/* → src/app/components/*
@pages/*     → src/app/pages/*
@assets/*    → src/assets/*
```

### Componentes compartidos

En `src/app/components/`: `CardSearchComponent`, `ProgressStatsComponent`, `CardCollectionCounterComponent`, `CardDetailPanelComponent`, `AddCardDialogComponent`, `SellCardsDialogComponent`, `SetListComponent`, `CardCheckboxItemComponent`.

### Datos estáticos

Los sets de Magic, Pokémon y Naruto están definidos en JSONs en `src/assets/card-collection/`. Para añadir un nuevo set hay que editar directamente estos archivos.
