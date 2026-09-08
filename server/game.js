import { cleanSave } from '../src/data.js';
export class GameError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}
export function initialState(legacy) {
  const save = cleanSave(legacy);
  save.packs = Math.min(save.packs, 100000);
  for (const key of Object.keys(save.cards)) save.cards[key] = Math.min(save.cards[key], 100000);
  save.packAccess.bonusStartedAt = null;
  return { save };
}
