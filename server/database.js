import { GameError } from './game.js';
import { makePack } from '../src/data.js';
import { BONUS_DELAY_MS } from '../src/pack-access.js';

export const readPlayer = (db, id) => db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

export async function createPlayer(db, id, { save }, now) {
  // Expand validated legacy counts in SQL, without issuing a request per card.
  await db.batch([
    db.prepare('INSERT INTO users (id, packs, opened, bonus_started_at, bonus_claimed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, save.packs, save.packAccess.opened, null, Number(save.packAccess.bonusClaimed), now, now),
    db.prepare(`WITH RECURSIVE copies(key, n, total) AS (
      SELECT key, 1, value FROM json_each(?) WHERE value > 0
      UNION ALL SELECT key, n + 1, total FROM copies WHERE n < total
    ) INSERT INTO card (id, user_id, person, finish, acquired_at)
    SELECT lower(hex(randomblob(16))), ?, CAST(substr(key,1,instr(key,'-')-1) AS INTEGER), CAST(substr(key,instr(key,'-')+1) AS INTEGER), ? FROM copies`)
      .bind(JSON.stringify(save.cards), id, now),
  ]);
}
async function snapshot(db, id, now, pack = null) {
  // One statement provides a consistent view of the balance and owned cards.
  const row = await db.prepare(`SELECT users.*, (SELECT json_group_object(key, quantity) FROM
    (SELECT person || '-' || finish AS key, COUNT(*) AS quantity FROM card WHERE user_id = users.id GROUP BY person, finish)) AS cards
    FROM users WHERE id = ?`).bind(id).first();
  if (!row) throw new GameError('Your browser session has expired. Refresh to continue.', 401);
  return { save: { cards: JSON.parse(row.cards || '{}'), packs: row.packs,
    packAccess: { opened: row.opened, bonusStartedAt: row.bonus_started_at, bonusClaimed: Boolean(row.bonus_claimed) } }, pack, serverTime: now };
}
async function receipt(db, id, requestId) {
  const row = await db.prepare(`SELECT p.id, (SELECT json_group_array(json_object('person', person, 'finish', finish))
    FROM (SELECT person, finish FROM card WHERE pack_id = p.id ORDER BY slot)) AS cards
    FROM pack_openings p WHERE user_id = ? AND request_id = ?`).bind(id, requestId).first();
  return row ? { id: row.id, cards: JSON.parse(row.cards) } : null;
}
export async function operate(db, id, action, body, now) {
  if (!await readPlayer(db, id)) throw new GameError('Your browser session has expired. Refresh to continue.', 401);
  await db.prepare('UPDATE users SET bonus_claimed = 1, revision = revision + 1, updated_at = ? WHERE id = ? AND bonus_claimed = 0 AND bonus_started_at IS NOT NULL AND bonus_started_at <= ?')
    .bind(now, id, now - BONUS_DELAY_MS).run();
  if (action === 'bonus') {
    const user = await readPlayer(db, id);
    if (!user.bonus_claimed && user.bonus_started_at === null && user.opened < 3) throw new GameError('Open your starter packs first.');
    await db.prepare('UPDATE users SET bonus_started_at = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND bonus_claimed = 0 AND bonus_started_at IS NULL AND opened >= 3')
      .bind(now, now, id).run();
  } else if (action === 'open') {
    if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)) throw new GameError('Invalid pack request.', 400);
    for (let attempt = 0; attempt < 8; attempt++) {
      const previous = await receipt(db, id, body.requestId);
      if (previous) return snapshot(db, id, now, previous);
      const user = await readPlayer(db, id);
      // Check the receipt again after reading the balance: a concurrent retry may have just committed.
      const settled = await receipt(db, id, body.requestId);
      if (settled) return snapshot(db, id, now, settled);
      if (user.opened >= 3 + user.bonus_claimed * 1000) throw new GameError('No packs left. Claim your bonus to keep opening.');
      const packId = crypto.randomUUID(), cards = makePack();
      const results = await db.batch([
        db.prepare(`INSERT INTO pack_openings (id, user_id, request_id, created_at)
          SELECT ?, id, ?, ? FROM users WHERE id = ? AND revision = ? AND opened < 3 + bonus_claimed * 1000
          ON CONFLICT(user_id, request_id) DO NOTHING`).bind(packId, body.requestId, now, id, user.revision),
        db.prepare(`INSERT INTO card (id, user_id, person, finish, pack_id, slot, acquired_at)
          SELECT lower(hex(randomblob(16))), ?, json_extract(value,'$.person'), json_extract(value,'$.finish'), ?, CAST(key AS INTEGER), ?
          FROM json_each(?) WHERE EXISTS (SELECT 1 FROM pack_openings WHERE id = ?)`)
          .bind(id, packId, now, JSON.stringify(cards), packId),
        db.prepare(`UPDATE users SET opened = opened + 1, packs = packs + 1, revision = revision + 1, updated_at = ?
          WHERE id = ? AND revision = ? AND EXISTS (SELECT 1 FROM pack_openings WHERE id = ?)`)
          .bind(now, id, user.revision, packId),
      ]);
      if (results[0].meta.changes === 1) return snapshot(db, id, now, { id: packId, cards });
    }
    throw new GameError('Your collection is busy. Please try again.');
  } else if (action !== 'state') throw new GameError('Not found.', 404);
  return snapshot(db, id, now);
}
