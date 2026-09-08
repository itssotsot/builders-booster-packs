import { GameError } from './game.js';

export async function readPlayer(db, id) {
  return db.prepare('SELECT state, revision FROM players WHERE id = ?').bind(id).first();
}
export async function createPlayer(db, id, state, now) {
  await db.prepare('INSERT INTO players (id, state, revision, created_at, updated_at) VALUES (?, ?, 0, ?, ?)')
    .bind(id, JSON.stringify(state), now, now).run();
}
export async function updatePlayer(db, id, change, now) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await readPlayer(db, id);
    if (!row) throw new GameError('Your browser session has expired. Refresh to start again.', 401);
    const state = change(JSON.parse(row.state));
    const encoded = JSON.stringify(state);
    if (encoded === row.state) return state;
    const result = await db.prepare('UPDATE players SET state = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ?')
      .bind(encoded, now, id, row.revision).run();
    if (result.meta.changes === 1) return state;
  }
  throw new GameError('Your collection is busy in another tab. Please try again.', 409);
}
