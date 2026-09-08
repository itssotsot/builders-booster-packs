import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  packs: integer('packs').notNull().default(0),
  opened: integer('opened').notNull().default(0),
  bonusStartedAt: integer('bonus_started_at'),
  bonusClaimed: integer('bonus_claimed').notNull().default(0),
  revision: integer('revision').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
// A durable request receipt makes retries safe even after another pack is opened.
export const packOpenings = sqliteTable('pack_openings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  requestId: text('request_id').notNull(),
  createdAt: integer('created_at').notNull(),
}, table => [uniqueIndex('pack_request').on(table.userId, table.requestId)]);
export const card = sqliteTable('card', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  person: integer('person').notNull(),
  finish: integer('finish').notNull(),
  packId: text('pack_id'),
  slot: integer('slot'),
  acquiredAt: integer('acquired_at').notNull(),
}, table => [index('card_owner').on(table.userId), uniqueIndex('card_pack_slot').on(table.packId, table.slot)]);
