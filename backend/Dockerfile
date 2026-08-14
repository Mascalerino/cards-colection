FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./dist/db/migrations
COPY --from=build /app/src/data ./dist/data
EXPOSE 3000
# Aplica migraciones pendientes y arranca el servidor (seguro reejecutar en cada despliegue).
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
