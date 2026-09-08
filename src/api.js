import { loadSave } from './data.js';
const IMPORT_KEY = 'booster.database-migration.v1';
let clockOffset = 0;
export const serverNow = () => Date.now() + clockOffset;

export async function request(action, body) {
  const response = await fetch(`/api/${action}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin', cache: 'no-store',
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not save your progress. Please try again.');
  clockOffset = data.serverTime - Date.now();
  return data;
}
export async function initializePlayer() {
  const initialize = async () => {
    let legacy;
    try { if (!localStorage.getItem(IMPORT_KEY)) legacy = loadSave(localStorage); } catch {}
    await request('session', { legacy });
    // Confirm the browser retained the HttpOnly session cookie before accepting play.
    const data = await request('state');
    try { localStorage.setItem(IMPORT_KEY, 'complete'); } catch {}
    return data;
  };
  return navigator.locks ? navigator.locks.request('booster-player-session', initialize) : initialize();
}
