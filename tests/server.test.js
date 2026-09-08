import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localDatabase } from '../server/local-database.js';
import { handleApi } from '../server/worker.js';
import { DatabaseSync } from 'node:sqlite';
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
  const { pack } = await open(DB, a.cookie);
  const own = await call(DB, 'session', { legacy: { cards: { '1-3': 999 }, packs: 999 } }, a.cookie);
  assert.equal(Object.values(own.data.save.cards).reduce((a,b) => a+b, 0), 5);
  assert.equal(own.data.save.packs, 1);
  const other = await call(DB, 'state', undefined, b.cookie);
  assert.deepEqual(other.data.save.cards, {});
  assert.equal(packsRemaining(other.data.save.packAccess), 3);
  assert.equal((await call(DB, 'reveal', { packId: pack.id, index: 0 }, b.cookie)).status, 404);
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
  assert.equal(new Set(opened.map(s => s.pack.id)).size, 1);
  assert.ok(opened.every(s => s.save.packAccess.opened === 1));
  const retry = await open(DB, a.cookie, requestId);
  assert.deepEqual(retry.pack, opened[0].pack);
  assert.equal(retry.save.packs, 1);
  for (let i = 0; i < 2; i++) await open(DB, a.cookie);
  assert.deepEqual((await open(DB, a.cookie, requestId)).pack, opened[0].pack);
  const blocked = await call(DB, 'open', { requestId: crypto.randomUUID() }, a.cookie);
  assert.equal(blocked.status, 409);
  assert.equal((await call(DB, 'state', undefined, a.cookie)).data.save.packs, 3);
});

test('opening grants five individual card rows; reveal and next have no server endpoint', async t => {
  const DB = fixture(t), a = await player(DB);
  const { pack, save } = await open(DB, a.cookie);
  assert.equal(Object.values(save.cards).reduce((a,b)=>a+b,0), 5);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM card').first()).n, 5);
  assert.equal((await DB.prepare('SELECT COUNT(DISTINCT id) AS n FROM card').first()).n, 5);
  for (const action of ['reveal', 'next']) assert.equal((await call(DB, action, {packId:pack.id,index:0}, a.cookie)).status, 404);
  const state = (await call(DB, 'state', undefined, a.cookie)).data;
  assert.equal(state.pack, null);
  assert.equal('activePack' in state, false);
  assert.deepEqual(state.save, save);
});

test('concurrent different pack requests cannot exceed the allowance', async t => {
  const DB = fixture(t), a = await player(DB);
  const responses = await Promise.all(Array.from({length:8}, () => call(DB,'open',{requestId:crypto.randomUUID()},a.cookie)));
  assert.equal(responses.filter(r=>r.status===200).length, 3);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM card').first()).n, 15);
});

test('failed card insertion rolls back both receipt and pack charge', async t => {
  const DB = fixture(t), a = await player(DB);
  await DB.prepare("CREATE TRIGGER fail_card BEFORE INSERT ON card BEGIN SELECT RAISE(ABORT, 'test rollback'); END").run();
  assert.equal((await call(DB, 'open', {requestId:crypto.randomUUID()}, a.cookie)).status, 503);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM pack_openings').first()).n, 0);
  assert.equal((await call(DB,'state',undefined,a.cookie)).data.save.packs, 0);
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

test('all five cards survive restart without resuming any opening', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'booster-db-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let DB = localDatabase(join(dir, 'save.sqlite'));
  const a = await player(DB);
  const { pack } = await open(DB, a.cookie);
  DB.close();
  DB = localDatabase(join(dir, 'save.sqlite'));
  const state = (await call(DB, 'state', undefined, a.cookie)).data;
  assert.equal(state.pack, null);
  assert.equal(Object.values(state.save.cards).reduce((a,b)=>a+b,0), 5);
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

test('migration preserves users, duplicate cards, bonus and unshown cards in old packs', t => {
  const dir = mkdtempSync(join(tmpdir(), 'booster-migrate-'));
  t.after(() => rmSync(dir, {recursive:true, force:true}));
  const file = join(dir,'save.sqlite'), old = new DatabaseSync(file);
  old.exec(readFileSync('drizzle/0000_green_captain_midlands.sql','utf8'));
  old.exec('CREATE TABLE local_migrations (name TEXT PRIMARY KEY)');
  old.prepare('INSERT INTO local_migrations VALUES (?)').run('0000_green_captain_midlands.sql');
  const state = {save:{packs:9,cards:{'1-0':3,'2-2':1},packAccess:{opened:4,bonusClaimed:true,bonusStartedAt:123}},
    lastPack:{id:'old-pack',cards:[{person:1,finish:0},{person:2,finish:2},{person:3,finish:0},{person:4,finish:1},{person:5,finish:3}],index:1,revealed:true,complete:false}};
  old.prepare('INSERT INTO players VALUES (?,?,?,?,?)').run('owner',JSON.stringify(state),8,100,200);
  old.close();
  const DB=localDatabase(file);
  t.after(()=>DB.close());
  return (async()=>{
    const user=await DB.prepare('SELECT * FROM users WHERE id = ?').bind('owner').first();
    assert.equal(user.packs,9); assert.equal(user.opened,4); assert.equal(user.bonus_claimed,1); assert.equal(user.created_at,100);
    assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM card').first()).n,7);
    assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM card WHERE person=1').first()).n,3);
    assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM card WHERE pack_id IS NOT NULL').first()).n,3);
  })();
});
