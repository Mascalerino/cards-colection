# Cards Collection

Aplicación para gestionar colecciones de cartas coleccionables (Magic: The Gathering, Pokémon, Naruto y One Piece), con backend propio, base de datos y login de usuario — pensada para autoalojarse (p. ej. en un NAS con Docker).

## 🚀 Características

- **Magic: The Gathering**: gestión completa de colecciones con integración a Scryfall API (precios, imágenes, foil/nonfoil), exportación de duplicados a CSV compatible con Cardmarket y registro de ventas.
- **Pokémon**: listado de sets y progreso.
- **Naruto**: checklist de cartas por serie/rareza, con exportación a PDF (listado completo y cartas faltantes).
- **One Piece**: sets y starter decks vía optcgapi.com, con precios de mercado.
- **Login con usuario y contraseña**: sesión con JWT en cookie httpOnly.
- **Persistencia en base de datos**: la colección de cada usuario vive en Postgres, no en el navegador — accesible desde cualquier dispositivo.
- **Importar/Exportar**: backup y restauración de todas las colecciones en un único JSON.
- **Búsqueda y filtros avanzados**, **estadísticas de progreso**.

## 🏗️ Arquitectura

```
┌─────────────┐      /api/*      ┌─────────────┐      SQL      ┌────────────┐
│  Angular 19 │ ───────────────▶ │   Backend    │ ─────────────▶│  Postgres  │
│  (nginx)    │ ◀─────────────── │ Express + TS │ ◀─────────────│            │
└─────────────┘                  └─────────────┘                └────────────┘
                                        │
                                        ▼
                          Scryfall API / optcgapi.com
                          (catálogo + precios, cacheados
                           en BD con TTL de 7 días)
```

- El **frontend** nunca llama directamente a Scryfall/optcgapi ni guarda nada en `localStorage`: todo pasa por el backend.
- El **backend** siembra el catálogo de cartas la primera vez que se pide un set, y solo vuelve a consultar precios cuando caducan (7 días).
- Cada usuario tiene su propia colección y su propio historial de ventas en la base de datos.

## 📋 Requisitos

- Docker y Docker Compose (para desplegar), **o** Node.js 20+ y Postgres 16+ (para desarrollo local sin Docker).

## 🐳 Despliegue con Docker (recomendado, p. ej. en TrueNAS)

1. Copia el archivo de variables de entorno y ajústalo:

   ```bash
   cp .env.example .env
   ```

   Como mínimo cambia `DB_PASSWORD` y `JWT_SECRET` por valores propios. `CORS_ORIGIN` y `APP_PORT` puedes dejarlos si vas a acceder por `http://<tu-nas>:8080`.

2. Levanta el stack:

   ```bash
   docker compose up -d --build
   ```

   Esto construye y arranca tres contenedores: `db` (Postgres), `backend` (API) y `frontend` (Angular servido por nginx, que además reenvía `/api` al backend). Las migraciones de base de datos se aplican automáticamente al arrancar el backend.

3. Crea tu usuario (no hay registro público, por diseño):

   ```bash
   docker compose exec backend node dist/scripts/create-user.js -- --username tu_usuario --password tu_contraseña
   ```

4. Abre `http://<host>:8080` (o el `APP_PORT` que hayas configurado) e inicia sesión.

### Actualizar la aplicación

```bash
git pull
docker compose up -d --build
```

Las migraciones pendientes se aplican solas en cada arranque del backend.

### Backup

Los datos viven en el volumen `db_data` de Docker (Postgres). Para un backup lógico:

```bash
docker compose exec db pg_dump -U <DB_USER> cards_collection > backup.sql
```

Además, desde la propia aplicación puedes exportar tu colección a un JSON en cualquier momento (botón "Exportar colecciones" en la página principal).

## 🔧 Desarrollo local (sin Docker)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # apunta DATABASE_URL a tu Postgres local
npm run db:migrate
npm run create-user -- --username admin --password admin1234
npm run dev             # http://localhost:3000
```

### Frontend

```bash
npm install
npm start                # http://localhost:4200, con proxy /api -> localhost:3000
```

### Tests

```bash
npm test
```

## 📁 Estructura del proyecto

```
.
├── src/                      # Frontend (Angular 19, standalone components)
│   ├── app/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── guards/             # authGuard
│   │   ├── interceptors/       # credentialsInterceptor
│   │   ├── models/              # Modelos de datos
│   │   ├── services/            # AuthService, CollectionApiService, SalesApiService...
│   │   └── pages/                # Páginas (magic, pokemon, naruto, onepiece, login...)
│   └── environments/
├── backend/                  # Backend (Express + TypeScript + Drizzle ORM)
│   └── src/
│       ├── config/             # env, conexión a BD
│       ├── db/                  # schema.ts + migraciones
│       ├── middleware/          # auth, errores
│       ├── modules/              # auth, cards, collection, sales, data-transfer
│       ├── data/                  # JSON de sets estáticos (Magic/Pokémon/Naruto)
│       └── scripts/create-user.ts
├── docker-compose.yml
├── Dockerfile                # frontend (build Angular + nginx)
├── nginx.conf
└── backend/Dockerfile
```

## 🎯 Rutas del frontend

- `/login` — inicio de sesión
- `/` — página principal con selector de juego + export/import
- `/magic`, `/magic/:setId`
- `/pokemon`
- `/naruto`, `/naruto/:seriesId`
- `/onepiece`, `/onepiece/:setId`

Todas salvo `/login` requieren sesión iniciada.

## 🛠️ Tecnologías utilizadas

**Frontend**: Angular 19, Angular Material, RxJS, TypeScript, SCSS, jsPDF.

**Backend**: Node.js, Express, TypeScript, Drizzle ORM, Postgres, JWT, bcrypt, Zod.

**Infraestructura**: Docker, Docker Compose, nginx.

## 🔍 Integración con APIs externas

Ambas se consultan **desde el backend**, nunca desde el navegador:

- **Scryfall API** (Magic): listados de cartas por expansión, imágenes, precios en EUR/USD.
- **optcgapi.com** (One Piece): sets, starter decks, cartas y precios de mercado.

## 🤝 Contribuir

1. Crea una rama para tu feature.
2. Realiza tus cambios.
3. Verifica que compila: `npm run build` (frontend) y `cd backend && npm run build` (backend).
4. Si tocas el esquema de la base de datos: `cd backend && npm run db:generate` para generar la migración.
5. Crea un commit con tus cambios.

## 📄 Licencia

Este proyecto es de código privado.

## 🐛 Troubleshooting

### La aplicación no carga
- Verifica que los contenedores estén arriba: `docker compose ps`
- Revisa los logs: `docker compose logs -f backend` / `docker compose logs -f frontend`

### No puedo iniciar sesión
- Confirma que el usuario existe: créalo con `docker compose exec backend node dist/scripts/create-user.js -- --username ... --password ...`
- Revisa que `JWT_SECRET` no haya cambiado entre despliegues (invalidaría las sesiones existentes, lo cual es normal y solo requiere volver a iniciar sesión).

### Las colecciones no se guardan
- Comprueba que el backend puede conectar con Postgres: `docker compose logs backend` debe mostrar "Migraciones aplicadas correctamente."
- Revisa la consola del navegador (pestaña Network) para ver si las peticiones a `/api/...` devuelven error.

### Errores al compilar
- Verifica la versión de Node.js: `node --version` (debe ser 20+)
- Limpia caché: `npm cache clean --force` y reinstala `node_modules`
