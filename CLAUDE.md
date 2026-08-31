# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Arquitectura general

Aplicación de dos partes:

- **Frontend** (`/`): Angular 19 con **componentes standalone** (sin NgModules), `ChangeDetectionStrategy.Default`, rutas cargadas de forma **lazy** vía `loadComponent`.
- **Backend** (`/backend`): API REST en Express + TypeScript, con Postgres (Drizzle ORM) como base de datos. Gestiona autenticación, el catálogo de cartas (sembrado desde JSON local o APIs externas) y la colección de cada usuario.

Todo el estado del usuario (colecciones, ventas) vive en la base de datos, **no en localStorage**. El frontend nunca llama directamente a Scryfall/optcgapi: siempre pasa por el backend, que hace de caché con TTL de 7 días.

## Comandos principales

### Frontend

```bash
# Servidor de desarrollo (proxy /api -> backend, ver proxy.conf.json)
npm start

# Build de producción
npm run build

# Tests (Karma + Jasmine)
npm test

# Generar un componente nuevo
ng generate component components/nombre-componente --standalone
```

### Backend (`cd backend`)

```bash
npm run dev          # servidor con recarga (tsx watch)
npm run build         # compila a dist/
npm run db:generate   # genera una migración nueva a partir de src/db/schema.ts
npm run db:migrate    # aplica migraciones pendientes
npm run create-user -- --username <u> --password <p>  # crea un usuario (no hay registro público)
```

### Docker (stack completo)

```bash
cp .env.example .env   # ajustar DB_PASSWORD, JWT_SECRET, etc.
docker compose up -d --build
docker compose exec app node dist/scripts/create-user.js -- --username admin --password ...
```

Ver `README-ES.md` para el detalle de despliegue (pensado para TrueNAS).

## Frontend

### Rutas y páginas

Todas las rutas salvo `/login` están protegidas por `authGuard` (comprueba la sesión contra `GET /api/auth/me`). `/admin` además exige `adminGuard` (comprueba `role === 'admin'` sobre el usuario ya cargado por `authGuard`).

| Ruta | Componente | Datos |
|---|---|---|
| `/login` | `LoginComponent` | — |
| `/` | `CardCollectionComponent` | Menú principal + export/import |
| `/admin` | `AdminComponent` | Gestión de usuarios vía `GET/POST /api/admin/users`, `PATCH /api/admin/users/:id/role`, `DELETE /api/admin/users/:id` (solo admins) |
| `/magic` | `MagicCollectionsComponent` | Sets vía `GET /api/magic/sets` |
| `/magic/:setId` | `MagicSetDetailComponent` | Cartas vía `GET /api/magic/sets/:setId/cards` |
| `/pokemon` | `PokemonCollectionsComponent` | Sets vía `GET /api/pokemon/sets` |
| `/naruto` | `NarutoCollectionsComponent` | Series vía `GET /api/naruto/sets` |
| `/naruto/:seriesId` | `NarutoSetDetailComponent` | Checklist generado a partir de `extra.rarities` |
| `/onepiece` | `OnePieceCollectionsComponent` | Sets y decks vía `GET /api/onepiece/sets` |
| `/onepiece/:setId` | `OnePieceSetDetailComponent` | Cartas vía `GET /api/onepiece/sets/:setId/cards` |

### Servicios

- **`AuthService`**: login/logout/me, expone `currentUser` (incluye `role`) y el computed `isAdmin`. El JWT viaja en una cookie httpOnly (nunca en localStorage ni en memoria expuesta a JS).
- **`UsersApiService`**: CRUD de usuarios contra `/api/admin/users`, usado solo por `AdminComponent`.
- **`CollectionApiService`**: cliente genérico del catálogo (`sets`, `sets/:id/cards`) y de la colección del usuario (`collection/:setId`) para cualquier juego. Todos los `cardId` que expone son el **externalId** de la carta (id de Scryfall, `card_set_id` de One Piece, código `SERIE-RAREZA-NUM` de Naruto), nunca un uuid interno.
- **`SalesApiService`**: ventas de Magic.
- **`DataTransferApiService`**: `GET /api/export` / `POST /api/import`, mismo formato JSON que el histórico basado en localStorage.
- **`CardCollectionService`**: mapea las respuestas del backend a los modelos `CardSet`/`Card` del frontend para Magic y Pokémon.
- **`OnePieceService`**: igual que el anterior pero para One Piece (incluye distinguir sets de decks vía `extra.kind`).

Interceptor `credentialsInterceptor`: añade `withCredentials` a toda petición a `environment.apiUrl` y redirige a `/login` en un 401.

### Alias de paths TypeScript

```
@models/*       → src/app/models/*
@services/*     → src/app/services/*
@components/*   → src/app/components/*
@pages/*        → src/app/pages/*
@assets/*       → src/assets/*
@environments/* → src/environments/*
```

### Componentes compartidos

En `src/app/components/`: `CardSearchComponent`, `ProgressStatsComponent`, `CardCollectionCounterComponent`, `CardDetailPanelComponent`, `AddCardDialogComponent`, `SellCardsDialogComponent`, `SetListComponent`, `CardCheckboxItemComponent`.

## Backend (`/backend`)

### Estructura

```
backend/src/
├── config/          # env.ts, db.ts (conexión Drizzle/Postgres)
├── db/
│   ├── schema.ts     # tablas (users, card_sets, cards, user_collection_entries, card_sales)
│   └── migrations/   # generadas con drizzle-kit
├── middleware/       # auth.middleware.ts (JWT de cookie), error.middleware.ts
├── modules/
│   ├── auth/          # login/logout/me
│   ├── cards/          # catálogo: sets + cartas, con providers por fuente
│   │   └── providers/   # scryfall.provider.ts, optcgapi.provider.ts, local-json.provider.ts
│   ├── collection/      # CRUD de la colección del usuario
│   ├── sales/           # ventas (Magic)
│   └── data-transfer/   # export/import
└── scripts/create-user.ts
```

### Catálogo de cartas (`modules/cards`)

`GET /api/:game/sets` y `GET /api/:game/sets/:setId/cards` siembran la BD la primera vez que se piden (desde JSON local para Pokémon/Naruto, o desde Scryfall/optcgapi para Magic/One Piece) y cachean precios con **TTL de 7 días** en `cards.pricesFetchedAt`. Los providers son intercambiables por juego; añadir un juego nuevo implica un provider nuevo y sus ramas en `cards.service.ts`.

Peculiaridades de las APIs externas que hay que recordar:
- Scryfall exige un `User-Agent` personalizado (si no, 400 `generic_user_agent`).
- optcgapi: `allDecks` devuelve `structure_deck_id`/`structure_deck_name` (no `deck_id`/`deck_name`), y `decks/filtered/` exige pasar **tanto** `deck_id` como `set_id` (con el mismo valor) o responde 400.
- Naruto no tiene catálogo externo: las cartas se generan a partir de los rangos `rarities` de `src/data/naruto-sets.json`, con el mismo formato de código que antes generaba el frontend (`SERIE-RAREZA-NUM`, 3 dígitos).
- Pokémon solo tiene listado de sets (sin catálogo de cartas individuales todavía).
- One Piece distingue **sets** de **decks** con `card_sets.extra.kind` (`'set'` | `'deck'`); ambos viven en la misma tabla bajo `game = 'onepiece'`.

### Colección del usuario (`modules/collection`)

`GET/PUT/DELETE /api/:game/collection/:setId[/:cardId]`. El `cardId` de la URL y de las respuestas es siempre el **externalId** de la carta (el backend traduce a/desde el uuid interno). `PUT` hace upsert por combinación de `variant`+`language`+`condition`; `quantity <= 0` borra la entrada.

### Auth y roles

JWT en cookie httpOnly (`cc_token`, 30 días), sin registro público. Cada usuario tiene `role` (`admin` | `user`, columna en `users`, incluido en el payload del JWT). Middleware `requireAuth` protege todo `/api/*` salvo `/api/auth/login`; `requireAdmin` (siempre después de `requireAuth`) protege `/api/admin/users` (`modules/users`: listar/crear/cambiar rol/borrar usuarios — un admin no puede tocar su propio rol ni borrarse a sí mismo).

Formas de crear usuarios:
- `npm run create-user -- --username <u> --password <p> [--role admin|user]` (CLI, rol `user` por defecto).
- Variables de entorno `ADMIN_USERNAME`/`ADMIN_PASSWORD`: si están definidas, `ensureBootstrapAdmin()` (`modules/auth/auth.service.ts`, llamado desde `index.ts` antes de `app.listen`) crea ese usuario como admin la primera vez que arranca el proceso, sin tocar la contraseña si ya existe. Pensado para el primer admin en Docker sin tener que ejecutar el script a mano.
- Desde el panel de administración del frontend (`/admin`, solo visible/accesible para `role = 'admin'`), que llama a `/api/admin/users`.

### Modelos de datos

- **Magic**: `Card` (con `foil`/`nonfoil`, `prices` en EUR, `cardmarket_id`). Las entradas de colección son `CardCollectionEntry` con `foilEntries`/`nonfoilEntries`, cada uno con idioma (`en`/`es`/`ja`), condición y cantidad — usado también para exportar duplicados a CSV compatible con Cardmarket.
- **One Piece**: `OnePieceCard` con `card_set_id` como identificador único (ej. `OP01-077`).

### Datos estáticos

Los JSON de sets de Magic/Pokémon/Naruto viven **duplicados** en `src/assets/card-collection/` (legado, ya no se usan en runtime) y en `backend/src/data/` (fuente real usada para sembrar la BD). Para añadir o modificar un set hay que editar `backend/src/data/*.json`.

## Docker

- `Dockerfile` (raíz): imagen única multi-stage que compila el frontend (Angular) y el backend (Express/TS) y los empaqueta juntos; en runtime el propio Express sirve el estático de `dist/cards-collection/browser` (variable `FRONTEND_DIST`) además de la API, con fallback SPA para cualquier ruta que no sea `/api/*` — no hay nginx de por medio. Aplica migraciones automáticamente al arrancar el contenedor (`node dist/db/migrate.js && node dist/index.js`).
- `docker-compose.yml`: orquesta `db` (Postgres) y `app` (la imagen única de arriba).
- `docker-compose.hub.yml` + `DOCKER_HUB.md`: variante que tira de la imagen ya publicada en Docker Hub (`tallon43/cards-collection`) en vez de construirla; `DOCKER_HUB.md` es el texto en inglés pensado para pegar en la página de Docker Hub.
