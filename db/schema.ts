import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// One aggregate per anonymous player makes each gameplay change atomic.
export const players = sqliteTable('players', {
  id: text('id').primaryKey(), // SHA-256 of the secret cookie, never the raw token.
  state: text('state').notNull(),
  revision: integer('revision').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
