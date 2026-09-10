import test from "node:test";
import assert from "node:assert/strict";
import {
  BUILDERS,
  OPENAI_BUILDERS,
  PACKS,
  getPack,
  packForPerson,
  COLLECTION_SIZE,
  makePack,
  seededRandom,
  cleanSave,
  cardKey,
} from "../src/data.js";
import { cleanPackAccess } from "../src/pack-access.js";
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
test("expanded roster has a reproducible seeded sequence", () => {
  assert.deepEqual(makePack(seededRandom(1)), [
    { person: 20, finish: 0 },
    { person: 16, finish: 2 },
    { person: 31, finish: 0 },
    { person: 18, finish: 1 },
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
        "76-0": 1,
        "1-4": 3,
        "1-1": -2,
        "2-1": 1.5,
        "00-0": 1,
        "-1-0": 1,
        broken: 9,
      },
      packs: Infinity,
    }),
    { cards: { "0-0": 2, "8-3": 1, "29-3": 1 }, packs: 0, packAccess: cleanPackAccess() },
  );
  assert.deepEqual(cleanSave(null), { cards: {}, packs: 0, packAccess: cleanPackAccess() });
});
test("expansion preserves the original nine card identities and old saves", () => {
  const originalHandles = ["thsottiaux", "sama", "Dimillian", "gdb", "polynoamial", "romainhuet", "embirico", "nickaturley", "michpokrass"];
  assert.deepEqual(BUILDERS.slice(0, 9).map((b) => b.handle), originalHandles);
  assert.equal(OPENAI_BUILDERS.length, 32);
  assert.equal(BUILDERS.length, 76);
  assert.equal(COLLECTION_SIZE, 296);
  assert.equal(BUILDERS[29].handle, "ajambrosino");
  assert.equal(BUILDERS[30].handle, "charliermarsh");
  assert.equal(BUILDERS[31].handle, "victornunez");
  assert.equal(new Set(BUILDERS.map((b) => b.handle.toLowerCase())).size, 75);
  const oldSave = { cards: Object.fromEntries(originalHandles.map((_, person) => [`${person}-3`, person + 1])), packs: 17 };
  assert.deepEqual(cleanSave(oldSave), { ...oldSave, packAccess: cleanPackAccess() });
});

test("every builder maps to an existing portrait cell, with distinct illustrated X artwork", () => {
  const cells = new Set();
  for (let person = 0; person < BUILDERS.length; person++) {
    const p = portraitLocation(person);
    assert.ok(p.column >= 0 && p.column < p.columns);
    assert.ok(p.row >= 0 && p.row < p.rows);
    assert.ok(existsSync(new URL(`../public/assets/${PORTRAIT_SHEETS[p.sheetIndex].file}`, import.meta.url)));
    cells.add(`${p.sheetIndex}-${p.column}-${p.row}`);
  }
  assert.equal(cells.size, BUILDERS.length);
  assert.notDeepEqual(portraitLocation(73), portraitLocation(2));
  for (const person of getPack("x-builders").people) {
    const { sheetIndex } = portraitLocation(person);
    if (BUILDERS[person].handle === "LexnLin") {
      assert.equal(PORTRAIT_SHEETS[sheetIndex].file, "x-builders/lexnlin.jpg");
    } else {
      assert.ok(PORTRAIT_SHEETS[sheetIndex].file.startsWith("x-builders-illustrated/"));
    }
  }
  assert.deepEqual(cleanSave({cards:{"2-3":1,"73-3":2,"74-0":1}}).cards, {"2-3":1,"73-3":2,"74-0":1});
  for (const invalid of [-1, 76, 0.5, NaN]) assert.throws(() => portraitLocation(invalid), RangeError);
});

test('the X Builders roster matches the 42 active selected accounts exactly', () => {
  const selected = 'levelsio mattpocockuk theo adamlyttleapps LLMJunky twannl dhh DonnyWals fireship_dev FlorinPop17 realGeorgeHotz ID_AA_Carmack johnsundell thekitze marclou MengTo neetcode1 twostraws rudrank seanallen_dev ThePrimeagen v_pradeilles weswinder itshanrw alexcooldev ios_dev_alb PirateSoftware Angaisb_ an21m daveschatz emanueledpt yacineMTB LexnLin krzyzanowskim marvinvonhagen mntruell mikeyk nikitabier iruletheworldmo argofowl Ananth7e RijnHartman'.toLowerCase().split(' ').sort();
  const pool = getPack('x-builders');
  assert.equal(pool.count, 42);
  assert.equal(pool.people.includes(73), false);
  assert.equal(getPack("openai").people.includes(2), true);
  assert.equal(pool.start, 32);
  assert.equal(BUILDERS[37].handle, 'karpathy');
  assert.equal(BUILDERS[38].handle, 'twannl');
  assert.equal(pool.people.includes(37), false);
  assert.equal(packForPerson(74).id, 'x-builders');
  assert.deepEqual(cleanSave({cards:{'37-3':1,'38-3':2,'74-0':1}}).cards, {'38-3':2,'74-0':1});
  assert.deepEqual(pool.people.map(person => BUILDERS[person].handle.toLowerCase()).sort(), selected);
  assert.deepEqual(cleanSave({cards:{'0-0':1,'31-3':2,'32-0':1,'71-3':2}}).cards, {'0-0':1,'31-3':2,'32-0':1,'71-3':2});
});

test('both editions draw only from their own pool and retain the rarity distribution', () => {
  for (const edition of PACKS) {
    const rng = seededRandom(260909), seen = new Set();
    let gold = 0;
    for (let i=0;i<10000;i++) {
      const pack = makePack(rng, edition.id);
      assert.equal(new Set(pack.map(c=>c.person)).size, 5);
      for (const card of pack) { assert.equal(packForPerson(card.person).id, edition.id); seen.add(card.person); }
      assert.ok(pack[4].finish >= 2);
      gold += pack[4].finish === 3;
    }
    assert.equal(seen.size, edition.count);
    assert.ok(gold > 60 && gold < 140);
  }
  assert.throws(()=>makePack(Math.random, 'invented'), RangeError);
});
