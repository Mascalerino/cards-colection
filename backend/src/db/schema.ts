import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 'magic' | 'pokemon' | 'naruto' | 'onepiece'
export type Game = 'magic' | 'pokemon' | 'naruto' | 'onepiece';

// 'admin' puede gestionar usuarios desde el panel de administración; 'user' es una cuenta normal.
export type UserRole = 'admin' | 'user';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user').$type<UserRole>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cardSets = pgTable(
  'card_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    game: text('game').notNull().$type<Game>(),
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    totalCards: integer('total_cards'),
    extra: jsonb('extra'),
  },
  (table) => ({
    gameExternalIdIdx: uniqueIndex('card_sets_game_external_id_idx').on(
      table.game,
      table.externalId,
    ),
  }),
);

export const cards = pgTable(
  'cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    game: text('game').notNull().$type<Game>(),
    setId: uuid('set_id').references(() => cardSets.id),
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    rarity: text('rarity'),
    imageUrl: text('image_url'),
    data: jsonb('data'),
    prices: jsonb('prices'),
    pricesFetchedAt: timestamp('prices_fetched_at', { withTimezone: true }),
  },
  (table) => ({
    gameExternalIdIdx: uniqueIndex('cards_game_external_id_idx').on(
      table.game,
      table.externalId,
    ),
  }),
);

export const userCollectionEntries = pgTable(
  'user_collection_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    variant: text('variant'), // 'foil' | 'nonfoil' | null
    language: text('language'), // 'en' | 'es' | 'ja' | null
    condition: text('condition'),
    quantity: integer('quantity').notNull().default(0),
    note: text('note'),
  },
  (table) => ({
    uniqueEntryIdx: uniqueIndex('user_collection_entries_unique_idx').on(
      table.userId,
      table.cardId,
      table.variant,
      table.language,
      table.condition,
    ),
  }),
);

export const cardSales = pgTable('card_sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  setId: uuid('set_id')
    .notNull()
    .references(() => cardSets.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
  cardName: text('card_name'),
  collectorNumber: text('collector_number'),
  language: text('language'),
  condition: text('condition'),
  variant: text('variant'),
  quantity: integer('quantity').notNull(),
  pricePerUnit: numeric('price_per_unit', { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  saleDate: timestamp('sale_date', { withTimezone: true }).notNull(),
});
