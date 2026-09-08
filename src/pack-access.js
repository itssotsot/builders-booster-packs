export const STARTER_PACKS = 3;
export const BONUS_PACKS = 1000;
export const BONUS_DELAY_MS = 5000;
// Set to the creator's profile; this is a timed gift, not a follow verification.
export const CREATOR_X_URL = "https://x.com/itssotsot";

export function cleanPackAccess(input) {
  const bonusClaimed = input?.bonusClaimed === true;
  const limit = STARTER_PACKS + (bonusClaimed ? BONUS_PACKS : 0);
  return {
    opened: Number.isSafeInteger(input?.opened)
      ? Math.max(0, Math.min(limit, input.opened))
      : 0,
    bonusStartedAt: Number.isSafeInteger(input?.bonusStartedAt) && input.bonusStartedAt > 0
      ? input.bonusStartedAt
      : null,
    bonusClaimed,
  };
}

export function packsRemaining(access) {
  return Math.max(0, STARTER_PACKS + (access.bonusClaimed ? BONUS_PACKS : 0) - access.opened);
}

export function spendPack(access) {
  if (packsRemaining(access) === 0) return null;
  return { ...access, opened: access.opened + 1 };
}

export function beginBonus(access, now = Date.now()) {
  if (access.bonusClaimed || access.bonusStartedAt !== null) return access;
  return { ...access, bonusStartedAt: now };
}

export function bonusSecondsRemaining(access, now = Date.now()) {
  if (access.bonusClaimed) return 0;
  if (access.bonusStartedAt === null) return BONUS_DELAY_MS / 1000;
  return Math.ceil(Math.max(0, Math.min(BONUS_DELAY_MS, access.bonusStartedAt + BONUS_DELAY_MS - now)) / 1000);
}

export function claimBonus(access, now = Date.now()) {
  if (access.bonusClaimed || access.bonusStartedAt === null || bonusSecondsRemaining(access, now) > 0)
    return access;
  return { ...access, bonusClaimed: true };
}
