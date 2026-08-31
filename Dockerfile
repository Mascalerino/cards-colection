# syntax=docker/dockerfile:1

# ── Stage 1: build del frontend (Angular) ────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY angular.json tsconfig*.json proxy.conf.json ./
COPY public ./public
COPY src ./src
RUN npm run build -- --configuration production

# ── Stage 2: build del backend (Express + TypeScript) ────────────────────────
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# ── Stage 3: imagen final de runtime ─────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    FRONTEND_DIST=/app/public

# Dependencias de producción del backend
COPY backend/package*.json ./
RUN npm install --omit=dev

# Backend compilado + datos estáticos del catálogo
COPY --from=backend-build /app/dist ./dist
COPY backend/src/db/migrations ./dist/db/migrations
COPY backend/src/data ./dist/data

# Frontend compilado (servido directamente por Express, sin nginx)
COPY --from=frontend-build /app/dist/cards-collection/browser ./public

EXPOSE 3000
# Aplica migraciones pendientes y arranca el servidor (seguro reejecutar en cada despliegue).
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
