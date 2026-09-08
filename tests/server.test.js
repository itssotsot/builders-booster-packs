import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localDatabase } from '../server/local-database.js';
import { handleApi } from '../server/worker.js';
import { cardKey } from '../src/data.js';
import { packsRemaining } from '../src/pack-access.js';

const origin = 'https://packs.test';
function fixture(t) {
  const DB = localDatabase(':memory:');
  t.after(() => DB.close());
  return DB;
}
async function call(DB, path, body, cookie, now = 100000, headers = {}) {
  const request = new Request(origin + '/api/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(body === undefined ? {} : { origin, 'content-type': 'application/json' }), ...(cookie ? { cookie } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const response = await handleApi(request, { DB }, now);
  return { status: response.status, headers: response.headers, data: await response.json() };
}
async function player(DB, legacy) {
  const response = await call(DB, 'session', { legacy });
  assert.equal(response.status, 200);
  return { cookie: response.headers.get('set-cookie').split(';')[0], data: response.data };
}
async function open(DB, cookie, requestId = crypto.randomUUID()) {
  const response = await call(DB, 'open', { requestId }, cookie);
  assert.equal(response.status, 200);
  return response.data;
}
async function finish(DB, cookie, pack) {
  for (let index = pack.index; index < 5; index++) {
    assert.equal((await call(DB, 'reveal', { packId: pack.id, index }, cookie)).status, 200);
    assert.equal((await call(DB, 'next', { packId: pack.id, index }, cookie)).status, 200);
  }
}

test('anonymous session uses a secure opaque cookie and rejects missing/forged identities', async t => {
  const DB = fixture(t);
  const response = await call(DB, 'session', {});
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /^__Host-booster-player=[a-f0-9]{64};/);
  for (const flag of ['HttpOnly', 'SameSite=Strict', 'Secure', 'Path=/']) assert.ok(cookie.includes(flag));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(packsRemaining(response.data.save.packAccess), 3);
  assert.equal((await call(DB, 'state')).status, 401);
  assert.equal((await call(DB, 'state', undefined, '__Host-booster-player=' + 'a'.repeat(64))).status, 401);
  assert.equal(JSON.stringify(response.data).includes(cookie.split('=')[1].split(';')[0]), false);
});

test('players have isolated collections; valid session reconnect preserves the same player', async t => {
  const DB = fixture(t);
  const a = await player(DB), b = await player(DB);
  const { activePack } = await open(DB, a.cookie);
  await call(DB, 'reveal', { packId: activePack.id, index: 0 }, a.cookie);
  const own = await call(DB, 'session', { legacy: { cards: { '1-3': 999 }, packs: 999 } }, a.cookie);
  assert.equal(Object.values(own.data.save.cards).reduce((a,b) => a+b, 0), 1);
  assert.equal(own.data.save.packs, 1);
  const other = await call(DB, 'state', undefined, b.cookie);
  assert.deepEqual(other.data.save.cards, {});
  assert.equal(packsRemaining(other.data.save.packAccess), 3);
  assert.equal((await call(DB, 'reveal', { packId: activePack.id, index: 0 }, b.cookie)).status, 409);
});

test('legacy collection imports once; later reconnects cannot replace database data', async t => {
  const DB = fixture(t);
  const a = await player(DB, { cards: { '2-3': 7, bad: 9 }, packs: 20, packAccess: { opened: 2 } });
  assert.deepEqual(a.data.save.cards, { '2-3': 7 });
  assert.equal(packsRemaining(a.data.save.packAccess), 1);
  const next = await call(DB, 'session', { legacy: { cards: { '1-1': 500 }, packs: 50 } }, a.cookie);
  assert.deepEqual(next.data.save.cards, { '2-3': 7 });
  assert.equal(next.data.save.packs, 20);
});

test('concurrent opens and retries consume one pack, and the fourth starter pack is refused', async t => {
  const DB = fixture(t);
  const a = await player(DB);
  const requestId = crypto.randomUUID();
  const opened = await Promise.all(Array.from({length: 6}, () => open(DB, a.cookie, requestId)));
  assert.equal(new Set(opened.map(s => s.activePack.id)).size, 1);
  assert.ok(opened.every(s => s.save.packAccess.opened === 1));
  await finish(DB, a.cookie, opened[0].activePack);
  const retry = await open(DB, a.cookie, requestId);
  assert.equal(retry.activePack, null);
  assert.equal(retry.save.packs, 1);
  for (let i = 0; i < 2; i++) await finish(DB, a.cookie, (await open(DB, a.cookie)).activePack);
  const blocked = await call(DB, 'open', { requestId: crypto.randomUUID() }, a.cookie);
  assert.equal(blocked.status, 409);
  assert.equal((await call(DB, 'state', undefined, a.cookie)).data.save.packs, 3);
});

test('reveals and next operations are ordered and idempotent under concurrent retries', async t => {
  const DB = fixture(t);
  const a = await player(DB);
  const { activePack } = await open(DB, a.cookie);
  const body = { packId: activePack.id, index: 0 };
  assert.equal((await call(DB, 'next', body, a.cookie)).status, 409);
  assert.equal((await call(DB, 'reveal', { ...body, index: 1 }, a.cookie)).status, 409);
  await Promise.all(Array.from({length: 5}, () => call(DB, 'reveal', body, a.cookie)));
  let state = (await call(DB, 'state', undefined, a.cookie)).data;
  assert.equal(state.save.cards[cardKey(activePack.cards[0])], 1);
  await Promise.all(Array.from({length: 5}, () => call(DB, 'next', body, a.cookie)));
  state = (await call(DB, 'state', undefined, a.cookie)).data;
  assert.equal(state.activePack.index, 1);
  assert.equal(state.activePack.revealed, false);
  assert.equal(Object.values(state.save.cards).reduce((a,b)=>a+b,0), 1);
});

test('bonus uses the server five-second deadline and is granted once even after repeated calls', async t => {
  const DB = fixture(t);
  const a = await player(DB, { packAccess: { opened: 3 } });
  const start = await call(DB, 'bonus', { now: 999999999, bonusClaimed: true }, a.cookie, 100000);
  assert.equal(start.data.save.packAccess.bonusStartedAt, 100000);
  assert.equal((await call(DB, 'state', undefined, a.cookie, 104999)).data.save.packAccess.bonusClaimed, false);
  const awarded = await Promise.all(Array.from({length: 5}, () => call(DB, 'state', undefined, a.cookie, 105000)));
  assert.ok(awarded.every(r => packsRemaining(r.data.save.packAccess) === 1000));
  const repeated = await call(DB, 'bonus', {}, a.cookie, 120000);
  assert.equal(repeated.status, 200);
  assert.equal(packsRemaining(repeated.data.save.packAccess), 1000);
  const b = await player(DB);
  assert.equal((await call(DB, 'bonus', {}, b.cookie)).status, 409);
});

test('unfinished card and collection survive a database restart', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'booster-db-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let DB = localDatabase(join(dir, 'save.sqlite'));
  const a = await player(DB);
  const { activePack } = await open(DB, a.cookie);
  await call(DB, 'reveal', { packId: activePack.id, index: 0 }, a.cookie);
  DB.close();
  DB = localDatabase(join(dir, 'save.sqlite'));
  const state = (await call(DB, 'state', undefined, a.cookie)).data;
  assert.equal(state.activePack.id, activePack.id);
  assert.equal(state.activePack.revealed, true);
  assert.deepEqual(state.activePack.cards, activePack.cards);
  assert.equal(packsRemaining(state.save.packAccess), 2);
  DB.close();
});

test('cross-site writes, invalid bodies and unsupported routes fail closed', async t => {
  const DB = fixture(t);
  const a = await player(DB);
  assert.equal((await call(DB, 'open', {requestId:crypto.randomUUID()}, a.cookie, 100000, { origin: 'https://other.test' })).status, 403);
  assert.equal((await call(DB, 'state', undefined, a.cookie, 100000, {'sec-fetch-site':'cross-site'})).status, 403);
  assert.equal((await call(DB, 'open', {}, a.cookie)).status, 400);
  assert.equal((await call(DB, 'balance', { balance: 100000 }, a.cookie)).status, 404);
  assert.equal((await call(DB, 'open', null, a.cookie)).status, 400);
  assert.equal((await call(DB, 'state', undefined, a.cookie)).data.save.packs, 0);
});
