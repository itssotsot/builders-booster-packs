import test from "node:test";
import assert from "node:assert/strict";
import { cleanSave } from "../src/data.js";
import {
  cleanPackAccess, packsRemaining, spendPack, beginBonus,
  bonusSecondsRemaining, claimBonus, BONUS_DELAY_MS, CREATOR_X_URL,
} from "../src/pack-access.js";

test("three starter packs are consumed once per opening; a fourth is blocked", () => {
  let access = cleanPackAccess();
  for (const expected of [3, 2, 1]) {
    assert.equal(packsRemaining(access), expected);
    access = spendPack(access);
  }
  assert.equal(packsRemaining(access), 0);
  assert.equal(spendPack(access), null);
});

test("the follow link awards exactly 1000 packs after five seconds, with no follow requirement", () => {
  assert.equal(CREATOR_X_URL, "https://x.com/itssotsot");
  assert.equal(BONUS_DELAY_MS, 5000);
  let access = cleanPackAccess({ opened: 3 });
  const started = beginBonus(access, 1000);
  assert.equal(beginBonus(started, 3000), started, "repeated clicks do not restart the timer");
  assert.equal(bonusSecondsRemaining(started, 1000), 5);
  assert.equal(bonusSecondsRemaining(started, 4999), 2);
  assert.equal(claimBonus(started, 5999), started, "no early reward");
  access = claimBonus(started, 6000);
  assert.equal(access.bonusClaimed, true);
  assert.equal(packsRemaining(access), 1000);
  assert.equal(claimBonus(access, 60000), access, "duplicate callbacks cannot grant again");
  access = spendPack(access);
  assert.equal(packsRemaining(access), 999);
  assert.equal(beginBonus(access, 70000), access, "claimed gifts cannot restart");
});

test("pending and claimed bonuses preserve their clock and balance through serialization", () => {
  const save = cleanSave({ cards: { "0-3": 2 }, packs: 3, packAccess: { opened: 3 } });
  save.packAccess = beginBonus(save.packAccess, 1000);
  let reloaded = cleanSave(JSON.parse(JSON.stringify(save)));
  assert.equal(bonusSecondsRemaining(reloaded.packAccess, 3500), 3);
  reloaded.packAccess = claimBonus(reloaded.packAccess, 6000);
  reloaded.packAccess = spendPack(reloaded.packAccess);
  reloaded = cleanSave(JSON.parse(JSON.stringify(reloaded)));
  assert.equal(packsRemaining(reloaded.packAccess), 999);
  assert.equal(claimBonus(reloaded.packAccess, 90000), reloaded.packAccess);
  assert.deepEqual(reloaded.cards, { "0-3": 2 });
});

test("old collections retain their cards and lifetime count, with three new starter packs", () => {
  const save = cleanSave({ cards: { "1-2": 11 }, packs: 45 });
  assert.equal(save.packs, 45);
  assert.deepEqual(save.cards, { "1-2": 11 });
  assert.equal(packsRemaining(save.packAccess), 3);
});

test("exhausted bonuses stay exhausted after reload; opening cannot create negative credit", () => {
  const access = cleanPackAccess({ opened: 1003, bonusClaimed: true, bonusStartedAt: 1000 });
  assert.equal(packsRemaining(access), 0);
  assert.equal(spendPack(access), null);
  assert.equal(claimBonus(access, 90000), access);
  assert.equal(packsRemaining(cleanPackAccess(JSON.parse(JSON.stringify(access)))), 0);
});

test("malformed access records cannot accidentally produce a reward or invalid balance", () => {
  for (const bad of [null, {}, { opened: NaN, bonusStartedAt: "now", bonusClaimed: "true" }]) {
    const access = cleanPackAccess(bad);
    assert.equal(packsRemaining(access), 3);
    assert.equal(claimBonus(access, 90000), access);
  }
  assert.equal(packsRemaining(cleanPackAccess({ opened: -3 })), 3);
  assert.equal(packsRemaining(cleanPackAccess({ opened: 90000 })), 0);
});
