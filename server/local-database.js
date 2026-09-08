import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// The local preview runs the exact same SQL/API against a persistent SQLite file.
export function localDatabase(filename = '.data/collections.sqlite') {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  database.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for (const file of readdirSync(resolve('drizzle')).filter(f => f.endsWith('.sql')).sort()) {
    if (database.prepare('SELECT name FROM local_migrations WHERE name = ?').get(file)) continue;
    database.exec('BEGIN');
    try {
      database.exec(readFileSync(resolve('drizzle', file), 'utf8'));
      database.prepare('INSERT INTO local_migrations (name) VALUES (?)').run(file);
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
  }
  return {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() { return database.prepare(sql).get(...args) ?? null; },
        async run() { const result = database.prepare(sql).run(...args); return { meta: { changes: Number(result.changes) } }; },
      };
    },
    close() { database.close(); },
  };
}
