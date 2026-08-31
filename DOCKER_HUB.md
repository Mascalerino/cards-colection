# Cards Collection

Self-hosted web app to track your trading card collections — **Magic: The Gathering**, **Pokémon**, **Naruto** and **One Piece** — with login, a real database (no localStorage) and price data cached from Scryfall / optcgapi.com.

This single image bundles the Angular frontend and the Express/TypeScript backend/API together. It only needs a Postgres database alongside it, run as a separate container via Docker Compose.

- Image: `tallon43/cards-collection`
- Source: https://github.com/Mascalerino/cards-colection

## Features

- **Magic: The Gathering** — full collection tracking via the Scryfall API (prices, images, foil/nonfoil), duplicate export to a Cardmarket-compatible CSV, sales tracking.
- **Pokémon** — set listing with collection progress.
- **Naruto** — per-series/rarity checklist, with PDF export (full list and missing cards).
- **One Piece** — sets and starter decks via optcgapi.com, with market prices.
- **Username/password login** — session via an httpOnly JWT cookie (no public sign-up: accounts are created by an admin).
- **Roles** — `admin` accounts get an in-app panel to create, promote/demote and delete other users; `user` accounts only manage their own collection.
- **Database-backed collections** — everything lives in Postgres, so your collection follows you across devices/browsers.
- **Import/Export** — back up and restore every collection as a single JSON file.

## Requirements

- Docker Engine and the Docker Compose plugin (`docker compose version`).

## Quick start

1. Download the two files below into an empty folder:
   - [`docker-compose.hub.yml`](https://raw.githubusercontent.com/Mascalerino/cards-colection/main/docker-compose.hub.yml) → save it as `docker-compose.yml`
   - [`.env.example`](https://raw.githubusercontent.com/Mascalerino/cards-colection/main/.env.example) → save it as `.env`

   ```bash
   mkdir cards-collection && cd cards-collection
   curl -L -o docker-compose.yml https://raw.githubusercontent.com/Mascalerino/cards-colection/main/docker-compose.hub.yml
   curl -L -o .env https://raw.githubusercontent.com/Mascalerino/cards-colection/main/.env.example
   ```

2. Edit `.env` and set your own values — at minimum change `DB_PASSWORD` and `JWT_SECRET`:

   ```env
   DB_USER=cards
   DB_PASSWORD=change-this-password
   JWT_SECRET=change-this-to-a-long-random-string
   JWT_EXPIRES_IN=30d
   CORS_ORIGIN=http://localhost:8080
   APP_PORT=8080
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=change-this-password-too
   ```

   - `CORS_ORIGIN` must match the URL you'll actually use to open the app (e.g. `http://192.168.1.50:8080` if you're running this on a home server/NAS).
   - `APP_PORT` is the port exposed on the host.
   - `ADMIN_USERNAME`/`ADMIN_PASSWORD` create your first account automatically the first time the app starts (see below) — there is no public registration.

3. Start the stack:

   ```bash
   docker compose up -d
   ```

   This pulls and starts two containers: `db` (Postgres) and `app` (this image — frontend + backend together). Database migrations run automatically when the app starts, and so does your admin account.

4. Open `http://<your-server>:8080` and log in with `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

## Passwords & secrets — where each one goes

There are **three different passwords/secrets**, set in two different places:

| What | Where | Variable / command |
|---|---|---|
| Database password | `.env` file, before starting the stack | `DB_PASSWORD=...` |
| JWT signing secret | `.env` file, before starting the stack | `JWT_SECRET=...` |
| Your admin login (first account) | `.env` file, before starting the stack — created automatically on first boot | `ADMIN_USERNAME=...` / `ADMIN_PASSWORD=...` |

`ADMIN_USERNAME`/`ADMIN_PASSWORD` only create the account **once**: if a user with that username already exists, the app leaves it untouched (so it's safe to keep those variables in `.env` across restarts/updates — they won't reset the password later). There is no public sign-up form.

## Adding more users (admin panel)

Once logged in as an admin, open the **Administration** panel (top-left button on the main page). From there an admin can:

- Create new accounts (as `user` or `admin`), with a username and password.
- Promote a `user` to `admin` or demote an `admin` back to `user`.
- Delete accounts.

`user` accounts only see and manage their own collection; `admin` accounts additionally get access to this panel. An admin can't change their own role or delete their own account (to avoid accidentally locking yourself out) — do that from another admin account.

## Updating

```bash
docker compose pull
docker compose up -d
```

Migrations are applied automatically on startup, so it's safe to update at any time.

## Data persistence

All collection data lives in the `db` container's `db_data` volume. Back it up like any other Postgres volume, or use the app's built-in **Export** feature (Menu → Export) to download a full JSON backup of your collections.

## Support / issues

Please report bugs and feature requests on the GitHub repository: https://github.com/Mascalerino/cards-colection/issues
