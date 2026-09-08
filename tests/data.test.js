import test from "node:test";
import assert from "node:assert/strict";
import {
  BUILDERS,
  COLLECTION_SIZE,
  makePack,
  seededRandom,
  cleanSave,
  cardKey,
  loadSave,
  saveCollection,
  STORAGE_KEY,
} from "../src/data.js";
import { PORTRAIT_SHEETS, portraitLocation } from "../src/artwork.js";
import { existsSync } from "node:fs";
test("10,000 seeded packs each have five different builders and a guaranteed holographic or gold final card", () => {
  const rng = seededRandom(82026);
  const frequencies = [0, 0, 0, 0];
  let goldFinal = 0;
  for (let n = 0; n < 10000; n++) {
    const pack = makePack(rng);
    assert.equal(pack.length, 5);
    assert.equal(new Set(pack.map((c) => c.person)).size, 5);
    assert.ok(pack[4].finish >= 2);
    goldFinal += Number(pack[4].finish === 3);
    for (const c of pack) {
      assert.ok(c.person >= 0 && c.person < BUILDERS.length);
      assert.ok(c.finish >= 0 && c.finish < 4);
    }
    for (const c of pack.slice(0, 4)) frequencies[c.finish]++;
  }
  const expected = [0.64, 0.25, 0.1, 0.01];
  frequencies.forEach((count, i) =>
    assert.ok(Math.abs(count / 40000 - expected[i]) < 0.012),
  );
  assert.ok(Math.abs(goldFinal / 10000 - 0.01) < 0.004);
});
test("the final slot has exactly 1% gold and 99% holographic across evenly spaced rolls", () => {
  const finishes = Array.from({ length: 1000 }, (_, i) =>
    makePack(() => (i + 0.5) / 1000)[4].finish,
  );
  assert.equal(finishes.filter((finish) => finish === 3).length, 10);
  assert.equal(finishes.filter((finish) => finish === 2).length, 990);
});
test("seed replay is deterministic; successive packs differ", () => {
  const a = seededRandom(52),
    b = seededRandom(52);
  const first = makePack(a);
  assert.deepEqual(first, makePack(b));
  assert.notDeepEqual(first, makePack(a));
});
test("ordinary packs preserve their original seeded sequence", () => {
  assert.deepEqual(makePack(seededRandom(1)), [
    { person: 18, finish: 0 },
    { person: 15, finish: 2 },
    { person: 29, finish: 0 },
    { person: 17, finish: 1 },
    { person: 11, finish: 3 },
  ]);
});
test("save validation rejects invalid variants, quantities and pack counts", () => {
  assert.deepEqual(
    cleanSave({
      cards: {
        "0-0": 2,
        "8-3": 1,
        "29-3": 1,
        "30-0": 1,
        "1-4": 3,
        "1-1": -2,
        "2-1": 1.5,
        "00-0": 1,
        "-1-0": 1,
        broken: 9,
      },
      packs: Infinity,
    }),
    { cards: { "0-0": 2, "8-3": 1, "29-3": 1 }, packs: 0 },
  );
  assert.deepEqual(cleanSave(null), { cards: {}, packs: 0 });
});
test("collection survives save/load and corrupted or unavailable storage degrades safely", () => {
  const memory = new Map();
  const storage = {
    getItem: (k) => memory.get(k),
    setItem: (k, v) => memory.set(k, v),
  };
  const state = {
    cards: { [cardKey({ person: 8, finish: 2 })]: 2 },
    packs: 4,
  };
  assert.equal(saveCollection(storage, state), true);
  assert.deepEqual(loadSave(storage), state);
  memory.set(STORAGE_KEY, "broken json");
  assert.deepEqual(loadSave(storage), { cards: {}, packs: 0 });
  assert.equal(
    saveCollection(
      {
        setItem() {
          throw new Error("denied");
        },
      },
      state,
    ),
    false,
  );
  assert.deepEqual(
    loadSave({
      getItem() {
        throw new Error("denied");
      },
    }),
    { cards: {}, packs: 0 },
  );
});

test("Builders edition never reads or overwrites the original creature collection", () => {
  const legacy = JSON.stringify({ cards: { "0-0": 7 }, packs: 12 });
  const memory = new Map([["rift.collection.v1", legacy]]);
  const storage = {
    getItem: (key) => memory.get(key),
    setItem: (key, value) => memory.set(key, value),
  };
  assert.deepEqual(loadSave(storage), { cards: {}, packs: 0 });
  saveCollection(storage, { cards: { "1-3": 1 }, packs: 1 });
  assert.equal(memory.get("rift.collection.v1"), legacy);
  assert.deepEqual(loadSave(storage), { cards: { "1-3": 1 }, packs: 1 });
});

test("expansion preserves the original nine card identities and old saves", () => {
  const originalHandles = ["thsottiaux", "sama", "Dimillian", "gdb", "polynoamial", "romainhuet", "embirico", "nickaturley", "michpokrass"];
  assert.deepEqual(BUILDERS.slice(0, 9).map((b) => b.handle), originalHandles);
  assert.equal(BUILDERS.length, 30);
  assert.equal(COLLECTION_SIZE, 120);
  assert.equal(BUILDERS[29].handle, "ajambrosino");
  assert.equal(new Set(BUILDERS.map((b) => b.handle.toLowerCase())).size, 30);
  const oldSave = { cards: Object.fromEntries(originalHandles.map((_, person) => [`${person}-3`, person + 1])), packs: 17 };
  assert.deepEqual(cleanSave(oldSave), oldSave);
});

test("every builder maps to a unique, existing portrait cell", () => {
  const cells = new Set();
  for (let person = 0; person < BUILDERS.length; person++) {
    const p = portraitLocation(person);
    assert.ok(p.column >= 0 && p.column < p.columns);
    assert.ok(p.row >= 0 && p.row < p.rows);
    assert.ok(existsSync(new URL(`../public/assets/${PORTRAIT_SHEETS[p.sheetIndex].file}`, import.meta.url)));
    cells.add(`${p.sheetIndex}-${p.column}-${p.row}`);
  }
  assert.equal(cells.size, BUILDERS.length);
  for (const invalid of [-1, 30, 0.5, NaN]) assert.throws(() => portraitLocation(invalid), RangeError);
});
