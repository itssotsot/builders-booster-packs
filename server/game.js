import { cleanSave, makePack, cardKey } from '../src/data.js';
import { beginBonus, claimBonus, spendPack } from '../src/pack-access.js';

export class GameError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}

export function initialState(legacy) {
  const save = cleanSave(legacy);
  // A bounded, once-only import preserves the old browser collection. New gameplay
  // never accepts balances, card identities, or timestamps supplied by the browser.
  save.packs = Math.min(save.packs, 100000);
  for (const key of Object.keys(save.cards)) save.cards[key] = Math.min(save.cards[key], 100000);
  save.packAccess.bonusStartedAt = null; // Do not trust an old client clock/deadline.
  return { save, lastPack: null };
}

export function publicState(state, now) {
  return { save: state.save, activePack: state.lastPack?.complete ? null : state.lastPack, serverTime: now };
}

export function changeState(state, action, body, now, random = Math.random) {
  const save = state.save;
  // Only the server clock may settle an already-started reward.
  save.packAccess = claimBonus(save.packAccess, now);
  const current = state.lastPack;
  if (action === 'open') {
    if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId))
      throw new GameError('Invalid pack request.', 400);
    if (current && (!current.complete || current.requestId === body.requestId)) return state;
    const access = spendPack(save.packAccess);
    if (!access) throw new GameError('No packs left. Claim your bonus to keep opening.');
    save.packAccess = access;
    save.packs++;
    state.lastPack = { id: crypto.randomUUID(), requestId: body.requestId, cards: makePack(random), index: 0, revealed: false, complete: false };
  } else if (action === 'reveal' || action === 'next') {
    if (!current || current.id !== body.packId || !Number.isInteger(body.index) || body.index < 0 || body.index > 4)
      throw new GameError('This pack has changed. Refresh to continue.');
    // A delayed retry for a completed/advanced card is harmless.
    if (current.complete || body.index < current.index) return state;
    if (body.index !== current.index) throw new GameError('Reveal the cards in order.');
    if (action === 'reveal' && !current.revealed) {
      const key = cardKey(current.cards[current.index]);
      save.cards[key] = (save.cards[key] || 0) + 1;
      current.revealed = true;
    } else if (action === 'next') {
      if (!current.revealed) throw new GameError('Reveal this card first.');
      if (current.index === 4) current.complete = true;
      else { current.index++; current.revealed = false; }
    }
  } else if (action === 'bonus') {
    if (save.packAccess.bonusClaimed || save.packAccess.bonusStartedAt !== null) return state;
    if (spendPack(save.packAccess) !== null) throw new GameError('Open your starter packs first.');
    save.packAccess = beginBonus(save.packAccess, now);
  } else if (action !== 'state') {
    throw new GameError('Not found.', 404);
  }
  return state;
}
