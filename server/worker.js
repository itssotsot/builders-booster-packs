import { GameError, initialState } from './game.js';
import { readPlayer, createPlayer, operate } from './database.js';

const YEAR = 60 * 60 * 24 * 365;
const cookieName = (url) => url.protocol === 'https:' ? '__Host-booster-player' : 'booster-player';
async function digest(token) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
}
function cookieToken(request, url) {
  const prefix = `${cookieName(url)}=`;
  const tokens = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).filter(v => v.startsWith(prefix));
  if (tokens.length !== 1) return null;
  const token = tokens[0].slice(prefix.length);
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}
function sessionCookie(url, token) {
  return `${cookieName(url)}=${token}; Path=/; Max-Age=${YEAR}; HttpOnly; SameSite=Strict${url.protocol === 'https:' ? '; Secure' : ''}`;
}
function json(body, status = 200, cookie) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}
export async function handleApi(request, env, now = Date.now()) {
  const url = new URL(request.url);
  try {
    if (!env.DB) throw new GameError('Saved collections are temporarily unavailable.', 503);
    if (request.headers.get('sec-fetch-site') === 'cross-site') throw new GameError('Not allowed.', 403);
    let body = {};
    if (request.method === 'POST') {
      if (request.headers.get('origin') !== url.origin) throw new GameError('Not allowed.', 403);
      if (!request.headers.get('content-type')?.startsWith('application/json')) throw new GameError('JSON required.', 415);
      if (Number(request.headers.get('content-length')) > 65536) throw new GameError('Request too large.', 413);
      const text = await request.text();
      if (text.length > 65536) throw new GameError('Request too large.', 413);
      try { body = JSON.parse(text); } catch { throw new GameError('Invalid request.', 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new GameError('Invalid request.', 400);
    } else if (request.method !== 'GET') throw new GameError('Method not allowed.', 405);
    let token = cookieToken(request, url);
    let id = token ? await digest(token) : null;
    if (url.pathname === '/api/session' && request.method === 'POST') {
      const existing = id && await readPlayer(env.DB, id);
      if (!existing) {
        token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
        id = await digest(token);
        await createPlayer(env.DB, id, initialState(body.legacy), now);
      }
    } else if (!id) throw new GameError('Your browser session has expired. Refresh to continue.', 401);
    let action;
    if ((url.pathname === '/api/state' && request.method === 'GET') || (url.pathname === '/api/session' && request.method === 'POST')) action = 'state';
    else if (request.method === 'POST' && /^\/api\/(open|bonus)$/.test(url.pathname)) action = url.pathname.slice(5);
    else throw new GameError('Not found.', 404);
    const state = await operate(env.DB, id, action, body, now);
    return json(state, 200, sessionCookie(url, token));
  } catch (error) {
    if (!(error instanceof GameError)) console.error('Collection operation failed:', error.message);
    return json({ error: error instanceof GameError ? error.message : 'Could not save your collection. Please try again.' }, error.status || 503);
  }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    // Sites serves the existing Vite client through the standard asset binding.
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not found', { status: 404 });
  },
};
